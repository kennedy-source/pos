import { SalesService, CreateSaleDto, CompleteSaleDto, ProcessReturnDto } from './sales.service';
export declare class SalesController {
    private salesService;
    constructor(salesService: SalesService);
    createDraft(dto: CreateSaleDto, req: any): Promise<any>;
    completeSale(id: string, dto: CompleteSaleDto, req: any): Promise<any>;
    cancelSale(id: string, body: {
        reason: string;
    }, req: any): Promise<any>;
    processReturn(dto: ProcessReturnDto, req: any): Promise<any>;
    findAll(query: any): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getDailySummary(date: string): Promise<{
        date: string;
        totalSales: any;
        totalRevenue: any;
        totalCost: any;
        grossProfit: number;
        byPaymentMethod: Record<string, number>;
    }>;
    findByReceipt(receiptNumber: string): Promise<any>;
    findOne(id: string): Promise<any>;
    initiateMpesa(body: {
        phone: string;
        amount: number;
        saleId: string;
    }): Promise<any>;
    mpesaCallback(body: any): Promise<void>;
}
