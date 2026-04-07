import { InventoryService, StockAdjustmentDto, BulkStockInDto } from './inventory.service';
export declare class InventoryController {
    private inventoryService;
    constructor(inventoryService: InventoryService);
    adjust(dto: StockAdjustmentDto, req: any): Promise<{
        variant: any;
        transaction: any;
    }>;
    bulkStockIn(dto: BulkStockInDto, req: any): Promise<any[]>;
    getTransactions(query: any): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getAlerts(): Promise<any>;
    getSummary(): Promise<{
        totalProducts: any;
        totalVariants: any;
        lowStockCount: any;
        alertCount: any;
        totalStockUnits: any;
    }>;
}
