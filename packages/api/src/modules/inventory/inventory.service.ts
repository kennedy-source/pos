import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockTransactionType } from '@prisma/client';

export interface StockAdjustmentDto {
  productId?: string;
  variantId: string;
  type: StockTransactionType;
  quantity: number; // always positive; direction inferred from type
  reason?: string;
  reference?: string;
  notes?: string;
  unitCost?: number;
}

export interface BulkStockInDto {
  items: {
    variantId: string;
    quantity: number;
    unitCost?: number;
    reference?: string;
  }[];
  supplierId?: string;
  invoiceRef?: string;
  notes?: string;
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private getDirectionMultiplier(type: StockTransactionType): number {
    const outTypes: StockTransactionType[] = [
      'STOCK_OUT', 'DAMAGED', 'LOST', 'SALE_DEDUCTION', 'TRANSFER_OUT'
    ];
    return outTypes.includes(type) ? -1 : 1;
  }

  async adjustStock(dto: StockAdjustmentDto, performedById: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: true },
    });
    if (!variant) throw new NotFoundException('Product variant not found');

    const direction = this.getDirectionMultiplier(dto.type);
    const quantityChange = dto.quantity * direction;
    const newStock = variant.currentStock + quantityChange;

    if (newStock < 0) {
      throw new BadRequestException(
        `Insufficient stock. Current: ${variant.currentStock}, Requested: ${dto.quantity}`
      );
    }

    const [updatedVariant, transaction] = await this.prisma.$transaction([
      this.prisma.productVariant.update({
        where: { id: dto.variantId },
        data: { currentStock: newStock },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          productId: dto.productId || variant.productId,
          variantId: dto.variantId,
          type: dto.type,
          quantity: quantityChange,
          quantityBefore: variant.currentStock,
          quantityAfter: newStock,
          unitCost: dto.unitCost,
          totalValue: dto.unitCost ? dto.unitCost * dto.quantity : undefined,
          reason: dto.reason,
          reference: dto.reference,
          notes: dto.notes,
          performedById,
        },
      }),
    ]);

    // Check and create stock alert if below reorder level
    const reorderLevel = variant.reorderLevel ?? variant.product.reorderLevel;
    if (newStock <= reorderLevel) {
      await this.createStockAlert(variant.productId, dto.variantId, newStock, reorderLevel);
    } else {
      // Resolve existing alerts
      await this.prisma.stockAlert.updateMany({
        where: { variantId: dto.variantId, isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });
    }

    return { variant: updatedVariant, transaction };
  }

  async bulkStockIn(dto: BulkStockInDto, performedById: string) {
    const results = [];
    for (const item of dto.items) {
      const result = await this.adjustStock(
        {
          variantId: item.variantId,
          type: 'STOCK_IN',
          quantity: item.quantity,
          unitCost: item.unitCost,
          reference: item.reference || dto.invoiceRef,
          notes: dto.notes,
          reason: `Bulk stock in. Invoice: ${dto.invoiceRef || 'N/A'}`,
        },
        performedById,
      );
      results.push(result);
    }
    return results;
  }

  async deductStockForSale(
    variantId: string,
    quantity: number,
    saleId: string,
    performedById: string,
  ) {
    return this.adjustStock(
      {
        variantId,
        type: 'SALE_DEDUCTION',
        quantity,
        reference: saleId,
        reason: `Sale: ${saleId}`,
      },
      performedById,
    );
  }

  async restoreStockForReturn(
    variantId: string,
    quantity: number,
    returnId: string,
    performedById: string,
  ) {
    return this.adjustStock(
      {
        variantId,
        type: 'RETURNED',
        quantity,
        reference: returnId,
        reason: `Return: ${returnId}`,
      },
      performedById,
    );
  }

  async getTransactionHistory(params: {
    productId?: string;
    variantId?: string;
    type?: StockTransactionType;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { productId, variantId, type, fromDate, toDate, page = 1, limit = 30 } = params;

    const where: any = {};
    if (productId) where.productId = productId;
    if (variantId) where.variantId = variantId;
    if (type) where.type = type;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [total, transactions] = await Promise.all([
      this.prisma.inventoryTransaction.count({ where }),
      this.prisma.inventoryTransaction.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, size: true, color: true, sku: true } },
          performedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { data: transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStockAlerts() {
    return this.prisma.stockAlert.findMany({
      where: { isResolved: false },
      include: {
        product: { include: { category: { select: { name: true } }, school: { select: { name: true } } } },
        variant: { select: { size: true, color: true, sku: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async createStockAlert(
    productId: string,
    variantId: string,
    currentQty: number,
    reorderLevel: number,
  ) {
    // Avoid duplicate alerts
    const existing = await this.prisma.stockAlert.findFirst({
      where: { variantId, isResolved: false },
    });

    if (!existing) {
      await this.prisma.stockAlert.create({
        data: { productId, variantId, currentQty, reorderLevel },
      });
    } else {
      await this.prisma.stockAlert.update({
        where: { id: existing.id },
        data: { currentQty },
      });
    }
  }

  async getInventorySummary() {
    const [totalProducts, totalVariants, lowStockCount, alertCount] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.productVariant.count({ where: { isActive: true } }),
      this.prisma.stockAlert.count({ where: { isResolved: false } }),
      this.prisma.stockAlert.count({ where: { isResolved: false } }),
    ]);

    const totalStockUnits = await this.prisma.productVariant.aggregate({
      where: { isActive: true },
      _sum: { currentStock: true },
    });

    return {
      totalProducts,
      totalVariants,
      lowStockCount,
      alertCount,
      totalStockUnits: totalStockUnits._sum.currentStock || 0,
    };
  }
}
