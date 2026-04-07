import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { SaleStatus, PaymentMethod } from '@prisma/client';
export interface CreateSaleItemDto {
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    discountAmt?: number;
    notes?: string;
}
export interface CreateSaleDto {
    customerId?: string;
    shiftId?: string;
    items: CreateSaleItemDto[];
    discountAmount?: number;
    notes?: string;
}
export interface CompleteSaleDto {
    payments: {
        method: PaymentMethod;
        amount: number;
        mpesaPhone?: string;
        bankRef?: string;
    }[];
}
export interface ProcessReturnDto {
    saleId: string;
    reason: string;
    refundMethod: PaymentMethod;
    items: {
        saleItemId: string;
        quantity: number;
        reason?: string;
    }[];
    restockItems?: boolean;
    notes?: string;
}
export declare class SalesService {
    private prisma;
    private inventoryService;
    constructor(prisma: PrismaService, inventoryService: InventoryService);
    private generateReceiptNumber;
    createDraft(dto: CreateSaleDto, cashierId: string): Promise<any>;
    completeSale(saleId: string, dto: CompleteSaleDto, cashierId: string): Promise<any>;
    cancelSale(saleId: string, reason: string, cashierId: string): Promise<any>;
    processReturn(dto: ProcessReturnDto, processedById: string): Promise<any>;
    findById(id: string): Promise<any>;
    findByReceipt(receiptNumber: string): Promise<any>;
    findAll(params: {
        status?: SaleStatus;
        cashierId?: string;
        customerId?: string;
        fromDate?: Date;
        toDate?: Date;
        paymentMethod?: PaymentMethod;
        page?: number;
        limit?: number;
    }): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getDailySummary(date: Date): Promise<{
        date: string;
        totalSales: any;
        totalRevenue: any;
        totalCost: any;
        grossProfit: number;
        byPaymentMethod: Record<string, number>;
    }>;
    initiateMpesaStkPush(phone: string, amount: number, saleId: string): Promise<any>;
    handleMpesaCallback(body: any): Promise<void>;
}
