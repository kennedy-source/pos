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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const dayjs_1 = __importDefault(require("dayjs"));
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardSummary() {
        const today = (0, dayjs_1.default)().startOf('day').toDate();
        const todayEnd = (0, dayjs_1.default)().endOf('day').toDate();
        const weekStart = (0, dayjs_1.default)().startOf('week').toDate();
        const monthStart = (0, dayjs_1.default)().startOf('month').toDate();
        const [todaySales, weekSales, monthSales, pendingEmbroidery, overdueEmbroidery, lowStockAlerts, recentSales, embroideryStats,] = await Promise.all([
            this.prisma.sale.aggregate({
                where: { status: 'COMPLETED', completedAt: { gte: today, lte: todayEnd } },
                _sum: { totalAmount: true },
                _count: true,
            }),
            this.prisma.sale.aggregate({
                where: { status: 'COMPLETED', completedAt: { gte: weekStart } },
                _sum: { totalAmount: true },
                _count: true,
            }),
            this.prisma.sale.aggregate({
                where: { status: 'COMPLETED', completedAt: { gte: monthStart } },
                _sum: { totalAmount: true },
                _count: true,
            }),
            this.prisma.embroideryJob.count({
                where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
            }),
            this.prisma.embroideryJob.count({
                where: {
                    dueDate: { lt: new Date() },
                    status: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] },
                },
            }),
            this.prisma.stockAlert.count({ where: { isResolved: false } }),
            this.prisma.sale.findMany({
                where: { status: 'COMPLETED' },
                orderBy: { completedAt: 'desc' },
                take: 8,
                include: {
                    customer: { select: { name: true } },
                    cashier: { select: { name: true } },
                    _count: { select: { items: true } },
                },
            }),
            this.prisma.embroideryJob.groupBy({
                by: ['status'],
                _count: true,
            }),
        ]);
        const todaySaleItems = await this.prisma.saleItem.findMany({
            where: { sale: { status: 'COMPLETED', completedAt: { gte: today, lte: todayEnd } } },
        });
        const todayCost = todaySaleItems.reduce((sum, item) => sum + Number(item.costPrice) * item.quantity, 0);
        const todayRevenue = Number(todaySales._sum.totalAmount || 0);
        return {
            today: {
                revenue: todayRevenue,
                salesCount: todaySales._count,
                cost: todayCost,
                grossProfit: todayRevenue - todayCost,
                profitMargin: todayRevenue > 0
                    ? Math.round(((todayRevenue - todayCost) / todayRevenue) * 100)
                    : 0,
            },
            week: {
                revenue: Number(weekSales._sum.totalAmount || 0),
                salesCount: weekSales._count,
            },
            month: {
                revenue: Number(monthSales._sum.totalAmount || 0),
                salesCount: monthSales._count,
            },
            embroidery: {
                pending: pendingEmbroidery,
                overdue: overdueEmbroidery,
                byStatus: embroideryStats,
            },
            alerts: {
                lowStock: lowStockAlerts,
            },
            recentSales,
        };
    }
    async getSalesReport(params) {
        const { fromDate, toDate } = params;
        const sales = await this.prisma.sale.findMany({
            where: {
                status: 'COMPLETED',
                completedAt: { gte: fromDate, lte: toDate },
            },
            include: {
                items: {
                    include: {
                        product: { include: { category: true, school: true } },
                        variant: true,
                    },
                },
                payments: true,
                cashier: { select: { id: true, name: true } },
                customer: { select: { id: true, name: true } },
            },
            orderBy: { completedAt: 'asc' },
        });
        const byDay = {};
        for (const sale of sales) {
            const day = (0, dayjs_1.default)(sale.completedAt).format('YYYY-MM-DD');
            if (!byDay[day])
                byDay[day] = { revenue: 0, cost: 0, count: 0 };
            byDay[day].revenue += Number(sale.totalAmount);
            byDay[day].cost += sale.items.reduce((s, i) => s + Number(i.costPrice) * i.quantity, 0);
            byDay[day].count += 1;
        }
        const byPaymentMethod = {};
        for (const sale of sales) {
            const method = sale.paymentMethod;
            byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(sale.totalAmount);
        }
        const productSales = {};
        for (const sale of sales) {
            for (const item of sale.items) {
                const key = item.productId;
                if (!productSales[key]) {
                    productSales[key] = { name: item.product.name, qty: 0, revenue: 0 };
                }
                productSales[key].qty += item.quantity;
                productSales[key].revenue += Number(item.lineTotal);
            }
        }
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        const totalRevenue = sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);
        const totalCost = sales.reduce((s, sale) => s + sale.items.reduce((is, i) => is + Number(i.costPrice) * i.quantity, 0), 0);
        return {
            summary: {
                totalSales: sales.length,
                totalRevenue,
                totalCost,
                grossProfit: totalRevenue - totalCost,
                averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
            },
            byDay: Object.entries(byDay).map(([date, data]) => ({
                date,
                ...data,
                profit: data.revenue - data.cost,
            })),
            byPaymentMethod,
            topProducts,
        };
    }
    async getInventoryReport() {
        const variants = await this.prisma.productVariant.findMany({
            where: { isActive: true },
            include: {
                product: {
                    include: {
                        category: { select: { name: true } },
                        school: { select: { name: true } },
                    },
                },
            },
            orderBy: { currentStock: 'asc' },
        });
        const lowStock = variants.filter((v) => {
            const reorder = v.reorderLevel ?? v.product.reorderLevel;
            return v.currentStock <= reorder;
        });
        const outOfStock = variants.filter((v) => v.currentStock === 0);
        const totalCostValue = variants.reduce((sum, v) => sum + Number(v.costPrice ?? v.product.costPrice) * v.currentStock, 0);
        const totalRetailValue = variants.reduce((sum, v) => sum + Number(v.sellingPrice ?? v.product.sellingPrice) * v.currentStock, 0);
        const byCategory = {};
        for (const v of variants) {
            const cat = v.product.category.name;
            if (!byCategory[cat])
                byCategory[cat] = { count: 0, units: 0, value: 0 };
            byCategory[cat].count += 1;
            byCategory[cat].units += v.currentStock;
            byCategory[cat].value += Number(v.sellingPrice ?? v.product.sellingPrice) * v.currentStock;
        }
        return {
            summary: {
                totalVariants: variants.length,
                totalUnits: variants.reduce((s, v) => s + v.currentStock, 0),
                totalCostValue,
                totalRetailValue,
                potentialProfit: totalRetailValue - totalCostValue,
                lowStockCount: lowStock.length,
                outOfStockCount: outOfStock.length,
            },
            lowStock: lowStock.map((v) => ({
                variantId: v.id,
                sku: v.sku,
                productName: v.product.name,
                size: v.size,
                color: v.color,
                currentStock: v.currentStock,
                reorderLevel: v.reorderLevel ?? v.product.reorderLevel,
                category: v.product.category.name,
                school: v.product.school?.name,
            })),
            outOfStock: outOfStock.map((v) => ({
                variantId: v.id,
                sku: v.sku,
                productName: v.product.name,
                size: v.size,
                color: v.color,
                school: v.product.school?.name,
            })),
            byCategory: Object.entries(byCategory).map(([name, data]) => ({ name, ...data })),
        };
    }
    async getEmbroideryReport(params) {
        const { fromDate, toDate } = params;
        const jobs = await this.prisma.embroideryJob.findMany({
            where: { createdAt: { gte: fromDate, lte: toDate } },
            include: {
                school: { select: { name: true } },
                operator: { select: { name: true } },
            },
        });
        const byStatus = {};
        const byOperator = {};
        const bySchool = {};
        let totalRevenue = 0;
        let totalDeposits = 0;
        let totalItems = 0;
        let completedJobs = 0;
        let avgTurnaround = 0;
        let turnaroundSum = 0;
        let turnaroundCount = 0;
        for (const job of jobs) {
            byStatus[job.status] = (byStatus[job.status] || 0) + 1;
            totalRevenue += Number(job.totalCost);
            totalDeposits += Number(job.depositPaid);
            totalItems += job.totalItems;
            if (['COMPLETED', 'DELIVERED'].includes(job.status)) {
                completedJobs += 1;
                if (job.startedAt && job.completedAt) {
                    const days = (0, dayjs_1.default)(job.completedAt).diff((0, dayjs_1.default)(job.startedAt), 'hour') / 24;
                    turnaroundSum += days;
                    turnaroundCount += 1;
                }
            }
            if (job.operatorId && job.operator) {
                const key = job.operatorId;
                if (!byOperator[key])
                    byOperator[key] = { name: job.operator.name, jobs: 0, revenue: 0 };
                byOperator[key].jobs += 1;
                byOperator[key].revenue += Number(job.totalCost);
            }
            if (job.schoolId && job.school) {
                const key = job.schoolId;
                if (!bySchool[key])
                    bySchool[key] = { name: job.school.name, jobs: 0, revenue: 0 };
                bySchool[key].jobs += 1;
                bySchool[key].revenue += Number(job.totalCost);
            }
        }
        if (turnaroundCount > 0)
            avgTurnaround = turnaroundSum / turnaroundCount;
        return {
            summary: {
                totalJobs: jobs.length,
                completedJobs,
                totalRevenue,
                totalDeposits,
                balanceOwed: totalRevenue - totalDeposits,
                totalItems,
                avgTurnaroundDays: Math.round(avgTurnaround * 10) / 10,
            },
            byStatus,
            byOperator: Object.values(byOperator).sort((a, b) => b.revenue - a.revenue),
            bySchool: Object.values(bySchool).sort((a, b) => b.revenue - a.revenue),
        };
    }
    async getTopCustomers(limit = 10) {
        return this.prisma.customer.findMany({
            where: { isActive: true },
            orderBy: { totalPurchases: 'desc' },
            take: limit,
            include: {
                school: { select: { name: true } },
                _count: { select: { sales: true, embroideryJobs: true } },
            },
        });
    }
    async getSalesByCashier(fromDate, toDate) {
        const sales = await this.prisma.sale.findMany({
            where: {
                status: 'COMPLETED',
                completedAt: { gte: fromDate, lte: toDate },
            },
            include: { cashier: { select: { id: true, name: true } } },
        });
        const byCashier = {};
        for (const sale of sales) {
            const key = sale.cashierId;
            if (!byCashier[key])
                byCashier[key] = { name: sale.cashier.name, count: 0, revenue: 0 };
            byCashier[key].count += 1;
            byCashier[key].revenue += Number(sale.totalAmount);
        }
        return Object.values(byCashier).sort((a, b) => b.revenue - a.revenue);
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map