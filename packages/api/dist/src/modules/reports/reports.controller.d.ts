import { ReportsService } from './reports.service';
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    getDashboard(): Promise<{
        today: {
            revenue: number;
            salesCount: any;
            cost: any;
            grossProfit: number;
            profitMargin: number;
        };
        week: {
            revenue: number;
            salesCount: any;
        };
        month: {
            revenue: number;
            salesCount: any;
        };
        embroidery: {
            pending: any;
            overdue: any;
            byStatus: any;
        };
        alerts: {
            lowStock: any;
        };
        recentSales: any;
    }>;
    getSales(query: any): Promise<{
        summary: {
            totalSales: any;
            totalRevenue: any;
            totalCost: any;
            grossProfit: number;
            averageOrderValue: number;
        };
        byDay: {
            profit: number;
            revenue: number;
            cost: number;
            count: number;
            date: string;
        }[];
        byPaymentMethod: Record<string, number>;
        topProducts: {
            name: string;
            qty: number;
            revenue: number;
        }[];
    }>;
    getInventory(): Promise<{
        summary: {
            totalVariants: any;
            totalUnits: any;
            totalCostValue: any;
            totalRetailValue: any;
            potentialProfit: number;
            lowStockCount: any;
            outOfStockCount: any;
        };
        lowStock: any;
        outOfStock: any;
        byCategory: {
            count: number;
            units: number;
            value: number;
            name: string;
        }[];
    }>;
    getEmbroidery(query: any): Promise<{
        summary: {
            totalJobs: any;
            completedJobs: number;
            totalRevenue: number;
            totalDeposits: number;
            balanceOwed: number;
            totalItems: number;
            avgTurnaroundDays: number;
        };
        byStatus: Record<string, number>;
        byOperator: {
            name: string;
            jobs: number;
            revenue: number;
        }[];
        bySchool: {
            name: string;
            jobs: number;
            revenue: number;
        }[];
    }>;
    getTopCustomers(limit: string): Promise<any>;
    getSalesByCashier(query: any): Promise<{
        name: string;
        count: number;
        revenue: number;
    }[]>;
}
