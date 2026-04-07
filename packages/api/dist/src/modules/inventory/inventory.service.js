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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getDirectionMultiplier(type) {
        const outTypes = [
            'STOCK_OUT', 'DAMAGED', 'LOST', 'SALE_DEDUCTION', 'TRANSFER_OUT'
        ];
        return outTypes.includes(type) ? -1 : 1;
    }
    async adjustStock(dto, performedById) {
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: dto.variantId },
            include: { product: true },
        });
        if (!variant)
            throw new common_1.NotFoundException('Product variant not found');
        const direction = this.getDirectionMultiplier(dto.type);
        const quantityChange = dto.quantity * direction;
        const newStock = variant.currentStock + quantityChange;
        if (newStock < 0) {
            throw new common_1.BadRequestException(`Insufficient stock. Current: ${variant.currentStock}, Requested: ${dto.quantity}`);
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
        const reorderLevel = variant.reorderLevel ?? variant.product.reorderLevel;
        if (newStock <= reorderLevel) {
            await this.createStockAlert(variant.productId, dto.variantId, newStock, reorderLevel);
        }
        else {
            await this.prisma.stockAlert.updateMany({
                where: { variantId: dto.variantId, isResolved: false },
                data: { isResolved: true, resolvedAt: new Date() },
            });
        }
        return { variant: updatedVariant, transaction };
    }
    async bulkStockIn(dto, performedById) {
        const results = [];
        for (const item of dto.items) {
            const result = await this.adjustStock({
                variantId: item.variantId,
                type: 'STOCK_IN',
                quantity: item.quantity,
                unitCost: item.unitCost,
                reference: item.reference || dto.invoiceRef,
                notes: dto.notes,
                reason: `Bulk stock in. Invoice: ${dto.invoiceRef || 'N/A'}`,
            }, performedById);
            results.push(result);
        }
        return results;
    }
    async deductStockForSale(variantId, quantity, saleId, performedById) {
        return this.adjustStock({
            variantId,
            type: 'SALE_DEDUCTION',
            quantity,
            reference: saleId,
            reason: `Sale: ${saleId}`,
        }, performedById);
    }
    async restoreStockForReturn(variantId, quantity, returnId, performedById) {
        return this.adjustStock({
            variantId,
            type: 'RETURNED',
            quantity,
            reference: returnId,
            reason: `Return: ${returnId}`,
        }, performedById);
    }
    async getTransactionHistory(params) {
        const { productId, variantId, type, fromDate, toDate, page = 1, limit = 30 } = params;
        const where = {};
        if (productId)
            where.productId = productId;
        if (variantId)
            where.variantId = variantId;
        if (type)
            where.type = type;
        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate)
                where.createdAt.gte = fromDate;
            if (toDate)
                where.createdAt.lte = toDate;
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
    async createStockAlert(productId, variantId, currentQty, reorderLevel) {
        const existing = await this.prisma.stockAlert.findFirst({
            where: { variantId, isResolved: false },
        });
        if (!existing) {
            await this.prisma.stockAlert.create({
                data: { productId, variantId, currentQty, reorderLevel },
            });
        }
        else {
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
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map