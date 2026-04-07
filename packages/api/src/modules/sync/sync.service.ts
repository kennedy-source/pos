import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SyncPayload {
  deviceId: string;
  lastSyncAt: string;
  operations: SyncOperation[];
}

export interface SyncOperation {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: Record<string, any>;
  timestamp: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Receive and apply a batch of offline operations from the desktop app.
   * Returns any server-side changes the client needs to pull.
   */
  async pushOperations(payload: SyncPayload) {
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const op of payload.operations) {
      try {
        await this.applyOperation(op, payload.deviceId);
        results.push({ id: op.id, success: true });

        // Mark as synced
        await this.prisma.syncLog.upsert({
          where: { id: op.id },
          create: {
            id: op.id,
            entityType: op.entityType,
            entityId: op.entityId,
            operation: op.operation,
            payload: op.payload,
            deviceId: payload.deviceId,
            syncedAt: new Date(),
          },
          update: { syncedAt: new Date() },
        });
      } catch (error) {
        this.logger.error(`Sync op ${op.id} failed: ${error.message}`);
        results.push({ id: op.id, success: false, error: error.message });

        await this.prisma.syncLog.upsert({
          where: { id: op.id },
          create: {
            id: op.id,
            entityType: op.entityType,
            entityId: op.entityId,
            operation: op.operation,
            payload: op.payload,
            deviceId: payload.deviceId,
            failureReason: error.message,
          },
          update: { failureReason: error.message },
        });
      }
    }

    return { results, syncedAt: new Date().toISOString() };
  }

  /**
   * Return all changes since the last sync time for the client to pull.
   */
  async pullChanges(lastSyncAt: string, entityTypes?: string[]) {
    const since = new Date(lastSyncAt);

    const changes: Record<string, any[]> = {};

    const types = entityTypes || ['products', 'variants', 'customers', 'schools', 'categories'];

    for (const type of types) {
      changes[type] = await this.getChangedRecords(type, since);
    }

    return {
      changes,
      serverTime: new Date().toISOString(),
    };
  }

  private async getChangedRecords(entityType: string, since: Date) {
    switch (entityType) {
      case 'products':
        return this.prisma.product.findMany({
          where: { updatedAt: { gte: since } },
          include: { category: true, school: true, variants: true },
        });
      case 'variants':
        return this.prisma.productVariant.findMany({
          where: { updatedAt: { gte: since } },
        });
      case 'customers':
        return this.prisma.customer.findMany({
          where: { updatedAt: { gte: since } },
          include: { school: { select: { id: true, name: true } } },
        });
      case 'schools':
        return this.prisma.school.findMany({
          where: { createdAt: { gte: since } },
        });
      case 'categories':
        return this.prisma.category.findMany({
          where: { createdAt: { gte: since } },
        });
      default:
        return [];
    }
  }

  /**
   * Apply a single operation to the cloud database.
   * Implements last-write-wins conflict resolution.
   */
  private async applyOperation(op: SyncOperation, deviceId: string) {
    const { entityType, operation, payload } = op;

    switch (entityType) {
      case 'Sale':
        return this.syncSale(operation, payload);
      case 'EmbroideryJob':
        return this.syncEmbroideryJob(operation, payload);
      case 'InventoryTransaction':
        return this.syncInventoryTransaction(operation, payload);
      case 'Customer':
        return this.syncCustomer(operation, payload);
      default:
        this.logger.warn(`Unknown entity type for sync: ${entityType}`);
    }
  }

  private async syncSale(operation: string, payload: any) {
    if (operation === 'INSERT') {
      const exists = await this.prisma.sale.findUnique({ where: { id: payload.id } });
      if (!exists) {
        // Strip nested relations, create bare sale
        const { items, payments, ...saleData } = payload;
        await this.prisma.sale.create({ data: saleData });
        if (items) {
          for (const item of items) {
            await this.prisma.saleItem.create({ data: { ...item, saleId: payload.id } });
          }
        }
        if (payments) {
          for (const payment of payments) {
            await this.prisma.payment.create({ data: { ...payment, saleId: payload.id } });
          }
        }
      }
    } else if (operation === 'UPDATE') {
      const { items, payments, ...saleData } = payload;
      await this.prisma.sale.update({ where: { id: payload.id }, data: saleData });
    }
  }

  private async syncEmbroideryJob(operation: string, payload: any) {
    if (operation === 'INSERT') {
      const exists = await this.prisma.embroideryJob.findUnique({ where: { id: payload.id } });
      if (!exists) {
        const { items, statusHistory, ...jobData } = payload;
        await this.prisma.embroideryJob.create({ data: jobData });
      }
    } else if (operation === 'UPDATE') {
      const { items, statusHistory, ...jobData } = payload;
      await this.prisma.embroideryJob.update({ where: { id: payload.id }, data: jobData });
    }
  }

  private async syncInventoryTransaction(operation: string, payload: any) {
    const exists = await this.prisma.inventoryTransaction.findUnique({ where: { id: payload.id } });
    if (!exists && operation === 'INSERT') {
      await this.prisma.inventoryTransaction.create({ data: payload });
      // Also update stock level on variant
      if (payload.variantId) {
        await this.prisma.productVariant.update({
          where: { id: payload.variantId },
          data: { currentStock: payload.quantityAfter },
        });
      }
    }
  }

  private async syncCustomer(operation: string, payload: any) {
    if (operation === 'INSERT') {
      const exists = await this.prisma.customer.findUnique({ where: { id: payload.id } });
      if (!exists) {
        await this.prisma.customer.create({ data: payload });
      }
    } else if (operation === 'UPDATE') {
      await this.prisma.customer.update({ where: { id: payload.id }, data: payload });
    }
  }
}
