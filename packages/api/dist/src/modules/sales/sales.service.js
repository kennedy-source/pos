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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
const axios_1 = __importDefault(require("axios"));
let SalesService = class SalesService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }
    generateReceiptNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 9000) + 1000;
        return `UNI-${year}${month}${day}-${random}`;
    }
    async createDraft(dto, cashierId) {
        const subtotal = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity - (item.discountAmt || 0), 0);
        const discountAmount = dto.discountAmount || 0;
        const totalAmount = subtotal - discountAmount;
        return this.prisma.sale.create({
            data: {
                receiptNumber: this.generateReceiptNumber(),
                customerId: dto.customerId,
                cashierId,
                shiftId: dto.shiftId,
                status: 'DRAFT',
                paymentStatus: 'PENDING',
                subtotal,
                discountAmount,
                taxAmount: 0,
                totalAmount,
                amountPaid: 0,
                changeGiven: 0,
                notes: dto.notes,
                items: {
                    create: dto.items.map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        costPrice: item.costPrice,
                        discountAmt: item.discountAmt || 0,
                        lineTotal: item.unitPrice * item.quantity - (item.discountAmt || 0),
                        notes: item.notes,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                        variant: { select: { id: true, size: true, color: true } },
                    },
                },
                customer: true,
                cashier: { select: { id: true, name: true } },
            },
        });
    }
    async completeSale(saleId, dto, cashierId) {
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                items: {
                    include: {
                        variant: true,
                        product: true,
                    },
                },
            },
        });
        if (!sale)
            throw new common_1.NotFoundException('Sale not found');
        if (sale.status === 'COMPLETED')
            throw new common_1.ConflictException('Sale already completed');
        if (sale.status === 'CANCELLED')
            throw new common_1.BadRequestException('Cannot complete a cancelled sale');
        const totalPaid = dto.payments.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid < Number(sale.totalAmount)) {
            throw new common_1.BadRequestException(`Insufficient payment. Required: KES ${sale.totalAmount}, Received: KES ${totalPaid}`);
        }
        const changeGiven = totalPaid - Number(sale.totalAmount);
        const paymentMethod = dto.payments.length === 1
            ? dto.payments[0].method
            : 'MIXED';
        await this.prisma.$transaction(async (tx) => {
            await tx.sale.update({
                where: { id: saleId },
                data: {
                    status: 'COMPLETED',
                    paymentStatus: 'PAID',
                    paymentMethod,
                    amountPaid: totalPaid,
                    changeGiven,
                    completedAt: new Date(),
                },
            });
            for (const payment of dto.payments) {
                await tx.payment.create({
                    data: {
                        saleId,
                        method: payment.method,
                        amount: payment.amount,
                        mpesaPhone: payment.mpesaPhone,
                        bankRef: payment.bankRef,
                        status: 'PAID',
                        paidAt: new Date(),
                    },
                });
            }
            for (const item of sale.items) {
                if (item.variantId) {
                    await this.inventoryService.deductStockForSale(item.variantId, item.quantity, saleId, cashierId);
                }
            }
            if (sale.customerId) {
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: {
                        totalPurchases: { increment: Number(sale.totalAmount) },
                        visitCount: { increment: 1 },
                    },
                });
            }
        });
        return this.findById(saleId);
    }
    async cancelSale(saleId, reason, cashierId) {
        const sale = await this.prisma.sale.findUnique({ where: { id: saleId } });
        if (!sale)
            throw new common_1.NotFoundException('Sale not found');
        if (sale.status === 'COMPLETED') {
            throw new common_1.BadRequestException('Cannot cancel a completed sale — use return/refund instead');
        }
        return this.prisma.sale.update({
            where: { id: saleId },
            data: { status: 'CANCELLED', notes: `CANCELLED: ${reason}` },
        });
    }
    async processReturn(dto, processedById) {
        const sale = await this.prisma.sale.findUnique({
            where: { id: dto.saleId },
            include: { items: true },
        });
        if (!sale)
            throw new common_1.NotFoundException('Sale not found');
        if (sale.status !== 'COMPLETED') {
            throw new common_1.BadRequestException('Can only return items from completed sales');
        }
        let refundAmount = 0;
        for (const returnItem of dto.items) {
            const saleItem = sale.items.find((i) => i.id === returnItem.saleItemId);
            if (!saleItem)
                throw new common_1.NotFoundException(`Sale item ${returnItem.saleItemId} not found`);
            if (returnItem.quantity > saleItem.quantity) {
                throw new common_1.BadRequestException('Return quantity exceeds sold quantity');
            }
            const unitPrice = Number(saleItem.unitPrice);
            refundAmount += unitPrice * returnItem.quantity;
        }
        const returnRecord = await this.prisma.$transaction(async (tx) => {
            const ret = await tx.return.create({
                data: {
                    saleId: dto.saleId,
                    reason: dto.reason,
                    refundAmount,
                    refundMethod: dto.refundMethod,
                    restockItems: dto.restockItems ?? true,
                    processedById,
                    notes: dto.notes,
                    returnItems: {
                        create: dto.items.map((item) => ({
                            saleItemId: item.saleItemId,
                            quantity: item.quantity,
                            reason: item.reason,
                        })),
                    },
                },
                include: { returnItems: true },
            });
            await tx.sale.update({
                where: { id: dto.saleId },
                data: {
                    status: 'PARTIALLY_REFUNDED',
                    paymentStatus: 'REFUNDED',
                },
            });
            return ret;
        });
        if (dto.restockItems !== false) {
            for (const returnItem of dto.items) {
                const saleItem = sale.items.find((i) => i.id === returnItem.saleItemId);
                if (saleItem?.variantId) {
                    await this.inventoryService.restoreStockForReturn(saleItem.variantId, returnItem.quantity, returnRecord.id, processedById);
                }
            }
        }
        return returnRecord;
    }
    async findById(id) {
        const sale = await this.prisma.sale.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: { include: { category: true, school: true } },
                        variant: true,
                    },
                },
                payments: true,
                customer: true,
                cashier: { select: { id: true, name: true } },
                returns: { include: { returnItems: true } },
            },
        });
        if (!sale)
            throw new common_1.NotFoundException('Sale not found');
        return sale;
    }
    async findByReceipt(receiptNumber) {
        const sale = await this.prisma.sale.findUnique({
            where: { receiptNumber },
            include: {
                items: { include: { product: true, variant: true } },
                payments: true,
                customer: true,
                cashier: { select: { id: true, name: true } },
            },
        });
        if (!sale)
            throw new common_1.NotFoundException(`Receipt ${receiptNumber} not found`);
        return sale;
    }
    async findAll(params) {
        const { status, cashierId, customerId, fromDate, toDate, paymentMethod, page = 1, limit = 20 } = params;
        const where = {};
        if (status)
            where.status = status;
        if (cashierId)
            where.cashierId = cashierId;
        if (customerId)
            where.customerId = customerId;
        if (paymentMethod)
            where.paymentMethod = paymentMethod;
        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate)
                where.createdAt.gte = fromDate;
            if (toDate)
                where.createdAt.lte = toDate;
        }
        const [total, sales] = await Promise.all([
            this.prisma.sale.count({ where }),
            this.prisma.sale.findMany({
                where,
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    cashier: { select: { id: true, name: true } },
                    items: { include: { product: { select: { name: true } }, variant: { select: { size: true, color: true } } } },
                    payments: true,
                    _count: { select: { items: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);
        return { data: sales, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async getDailySummary(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const [sales, payments] = await Promise.all([
            this.prisma.sale.findMany({
                where: {
                    status: 'COMPLETED',
                    completedAt: { gte: startOfDay, lte: endOfDay },
                },
                include: { items: { include: { product: true, variant: true } } },
            }),
            this.prisma.payment.findMany({
                where: {
                    status: 'PAID',
                    paidAt: { gte: startOfDay, lte: endOfDay },
                },
            }),
        ]);
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const totalCost = sales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + Number(i.costPrice) * i.quantity, 0), 0);
        const byPaymentMethod = {};
        for (const p of payments) {
            byPaymentMethod[p.method] = (byPaymentMethod[p.method] || 0) + Number(p.amount);
        }
        return {
            date: date.toISOString().split('T')[0],
            totalSales: sales.length,
            totalRevenue,
            totalCost,
            grossProfit: totalRevenue - totalCost,
            byPaymentMethod,
        };
    }
    async initiateMpesaStkPush(phone, amount, saleId) {
        const consumerKey = process.env.MPESA_CONSUMER_KEY;
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        const shortcode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;
        const callbackUrl = process.env.MPESA_CALLBACK_URL;
        if (!consumerKey || !consumerSecret) {
            throw new common_1.BadRequestException('M-Pesa credentials not configured');
        }
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const tokenRes = await axios_1.default.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', { headers: { Authorization: `Basic ${auth}` } });
        const token = tokenRes.data.access_token;
        const timestamp = new Date()
            .toISOString()
            .replace(/[-:T.Z]/g, '')
            .slice(0, 14);
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
        const formattedPhone = phone.startsWith('0')
            ? `254${phone.slice(1)}`
            : phone.startsWith('+')
                ? phone.slice(1)
                : phone;
        const stkRes = await axios_1.default.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.ceil(amount),
            PartyA: formattedPhone,
            PartyB: shortcode,
            PhoneNumber: formattedPhone,
            CallBackURL: `${callbackUrl}/api/v1/sales/mpesa-callback`,
            AccountReference: `UNI-${saleId.slice(0, 8).toUpperCase()}`,
            TransactionDesc: 'School Uniform Payment',
        }, { headers: { Authorization: `Bearer ${token}` } });
        return stkRes.data;
    }
    async handleMpesaCallback(body) {
        const { Body } = body;
        if (!Body?.stkCallback)
            return;
        const { MerchantRequestID, CheckoutRequestID, ResultCode, CallbackMetadata } = Body.stkCallback;
        if (ResultCode !== 0)
            return;
        const metadata = CallbackMetadata?.Item || [];
        const mpesaCode = metadata.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;
        const phoneNumber = metadata.find((i) => i.Name === 'PhoneNumber')?.Value?.toString();
        const amount = metadata.find((i) => i.Name === 'Amount')?.Value;
        await this.prisma.payment.updateMany({
            where: { mpesaPhone: phoneNumber, status: 'PENDING' },
            data: {
                status: 'PAID',
                mpesaCode,
                mpesaReceiptNo: mpesaCode,
                paidAt: new Date(),
            },
        });
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService])
], SalesService);
//# sourceMappingURL=sales.service.js.map