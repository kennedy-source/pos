import { PrismaService } from '../../prisma/prisma.service';
import { StockTransactionType } from '@prisma/client';
export interface StockAdjustmentDto {
    productId?: string;
    variantId: string;
    type: StockTransactionType;
    quantity: number;
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
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    private getDirectionMultiplier;
    adjustStock(dto: StockAdjustmentDto, performedById: string): Promise<{
        variant: any;
        transaction: any;
    }>;
    bulkStockIn(dto: BulkStockInDto, performedById: string): Promise<any[]>;
    deductStockForSale(variantId: string, quantity: number, saleId: string, performedById: string): Promise<{
        variant: any;
        transaction: any;
    }>;
    restoreStockForReturn(variantId: string, quantity: number, returnId: string, performedById: string): Promise<{
        variant: any;
        transaction: any;
    }>;
    getTransactionHistory(params: {
        productId?: string;
        variantId?: string;
        type?: StockTransactionType;
        fromDate?: Date;
        toDate?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getStockAlerts(): Promise<any>;
    private createStockAlert;
    getInventorySummary(): Promise<{
        totalProducts: any;
        totalVariants: any;
        lowStockCount: any;
        alertCount: any;
        totalStockUnits: any;
    }>;
}
