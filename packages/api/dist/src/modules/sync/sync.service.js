"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SyncService = SyncService_1 = class SyncService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SyncService_1.name);
    }
    async pushOperations(payload) {
        const results = [];
        for (const op of payload.operations) {
            try {
                await this.applyOperation(op, payload.deviceId);
                results.push({ id: op.id, success: true });
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
            }
            catch (error) {
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
    async pullChanges(lastSyncAt, entityTypes) {
        const since = new Date(lastSyncAt);
        const changes = {};
        const types = entityTypes || ['products', 'variants', 'customers', 'schools', 'categories'];
        for (const type of types) {
            changes[type] = await this.getChangedRecords(type, since);
        }
        return {
            changes,
            serverTime: new Date().toISOString(),
        };
    }
    async getChangedRecords(entityType, since) {
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
    async applyOperation(op, deviceId) {
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
    async syncSale(operation, payload) {
        if (operation === 'INSERT') {
            const exists = await this.prisma.sale.findUnique({ where: { id: payload.id } });
            if (!exists) {
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
        }
        else if (operation === 'UPDATE') {
            const { items, payments, ...saleData } = payload;
            await this.prisma.sale.update({ where: { id: payload.id }, data: saleData });
        }
    }
    async syncEmbroideryJob(operation, payload) {
        if (operation === 'INSERT') {
            const exists = await this.prisma.embroideryJob.findUnique({ where: { id: payload.id } });
            if (!exists) {
                const { items, statusHistory, ...jobData } = payload;
                await this.prisma.embroideryJob.create({ data: jobData });
            }
        }
        else if (operation === 'UPDATE') {
            const { items, statusHistory, ...jobData } = payload;
            await this.prisma.embroideryJob.update({ where: { id: payload.id }, data: jobData });
        }
    }
    async syncInventoryTransaction(operation, payload) {
        const exists = await this.prisma.inventoryTransaction.findUnique({ where: { id: payload.id } });
        if (!exists && operation === 'INSERT') {
            await this.prisma.inventoryTransaction.create({ data: payload });
            if (payload.variantId) {
                await this.prisma.productVariant.update({
                    where: { id: payload.variantId },
                    data: { currentStock: payload.quantityAfter },
                });
            }
        }
    }
    async syncCustomer(operation, payload) {
        if (operation === 'INSERT') {
            const exists = await this.prisma.customer.findUnique({ where: { id: payload.id } });
            if (!exists) {
                await this.prisma.customer.create({ data: payload });
            }
        }
        else if (operation === 'UPDATE') {
            await this.prisma.customer.update({ where: { id: payload.id }, data: payload });
        }
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SyncService);
//# sourceMappingURL=sync.service.js.map