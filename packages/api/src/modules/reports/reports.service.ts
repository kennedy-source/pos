import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary() {
    const today = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const weekStart = dayjs().startOf('week').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [
      todaySales,
      weekSales,
      monthSales,
      pendingEmbroidery,
      overdueEmbroidery,
      lowStockAlerts,
      recentSales,
      embroideryStats,
    ] = await Promise.all([
      // Today's sales aggregation
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: today, lte: todayEnd } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Week sales
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: weekStart } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Month sales
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: monthStart } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Pending embroidery jobs
      this.prisma.embroideryJob.count({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      // Overdue embroidery
      this.prisma.embroideryJob.count({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] },
        },
      }),
      // Low stock alerts
      this.prisma.stockAlert.count({ where: { isResolved: false } }),
      // Recent sales (last 8)
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
      // Embroidery job stats
      this.prisma.embroideryJob.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // Today's cost for profit calc
    const todaySaleItems = await this.prisma.saleItem.findMany({
      where: { sale: { status: 'COMPLETED', completedAt: { gte: today, lte: todayEnd } } },
    });
    const todayCost = todaySaleItems.reduce(
      (sum, item) => sum + Number(item.costPrice) * item.quantity,
      0,
    );
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

  async getSalesReport(params: {
    fromDate: Date;
    toDate: Date;
    groupBy?: 'day' | 'week' | 'month';
  }) {
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

    // Aggregate by day
    const byDay: Record<string, { revenue: number; cost: number; count: number }> = {};
    for (const sale of sales) {
      const day = dayjs(sale.completedAt).format('YYYY-MM-DD');
      if (!byDay[day]) byDay[day] = { revenue: 0, cost: 0, count: 0 };
      byDay[day].revenue += Number(sale.totalAmount);
      byDay[day].cost += sale.items.reduce(
        (s, i) => s + Number(i.costPrice) * i.quantity, 0
      );
      byDay[day].count += 1;
    }

    // Payment method breakdown
    const byPaymentMethod: Record<string, number> = {};
    for (const sale of sales) {
      const method = sale.paymentMethod;
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(sale.totalAmount);
    }

    // Top selling products
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
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
    const totalCost = sales.reduce(
      (s, sale) => s + sale.items.reduce((is, i) => is + Number(i.costPrice) * i.quantity, 0),
      0,
    );

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

    const totalCostValue = variants.reduce(
      (sum, v) => sum + Number(v.costPrice ?? v.product.costPrice) * v.currentStock,
      0,
    );
    const totalRetailValue = variants.reduce(
      (sum, v) => sum + Number(v.sellingPrice ?? v.product.sellingPrice) * v.currentStock,
      0,
    );

    // Category breakdown
    const byCategory: Record<string, { count: number; units: number; value: number }> = {};
    for (const v of variants) {
      const cat = v.product.category.name;
      if (!byCategory[cat]) byCategory[cat] = { count: 0, units: 0, value: 0 };
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

  async getEmbroideryReport(params: { fromDate: Date; toDate: Date }) {
    const { fromDate, toDate } = params;

    const jobs = await this.prisma.embroideryJob.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      include: {
        school: { select: { name: true } },
        operator: { select: { name: true } },
      },
    });

    const byStatus: Record<string, number> = {};
    const byOperator: Record<string, { name: string; jobs: number; revenue: number }> = {};
    const bySchool: Record<string, { name: string; jobs: number; revenue: number }> = {};

    let totalRevenue = 0;
    let totalDeposits = 0;
    let totalItems = 0;
    let completedJobs = 0;
    let avgTurnaround = 0;
    let turnaroundSum = 0;
    let turnaroundCount = 0;

    for (const job of jobs) {
      // Status breakdown
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;

      // Revenue
      totalRevenue += Number(job.totalCost);
      totalDeposits += Number(job.depositPaid);
      totalItems += job.totalItems;

      // Completed count
      if (['COMPLETED', 'DELIVERED'].includes(job.status)) {
        completedJobs += 1;
        if (job.startedAt && job.completedAt) {
          const days = dayjs(job.completedAt).diff(dayjs(job.startedAt), 'hour') / 24;
          turnaroundSum += days;
          turnaroundCount += 1;
        }
      }

      // By operator
      if (job.operatorId && job.operator) {
        const key = job.operatorId;
        if (!byOperator[key]) byOperator[key] = { name: job.operator.name, jobs: 0, revenue: 0 };
        byOperator[key].jobs += 1;
        byOperator[key].revenue += Number(job.totalCost);
      }

      // By school
      if (job.schoolId && job.school) {
        const key = job.schoolId;
        if (!bySchool[key]) bySchool[key] = { name: job.school.name, jobs: 0, revenue: 0 };
        bySchool[key].jobs += 1;
        bySchool[key].revenue += Number(job.totalCost);
      }
    }

    if (turnaroundCount > 0) avgTurnaround = turnaroundSum / turnaroundCount;

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

  async getSalesByCashier(fromDate: Date, toDate: Date) {
    const sales = await this.prisma.sale.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: fromDate, lte: toDate },
      },
      include: { cashier: { select: { id: true, name: true } } },
    });

    const byCashier: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const sale of sales) {
      const key = sale.cashierId;
      if (!byCashier[key]) byCashier[key] = { name: sale.cashier.name, count: 0, revenue: 0 };
      byCashier[key].count += 1;
      byCashier[key].revenue += Number(sale.totalAmount);
    }

    return Object.values(byCashier).sort((a, b) => b.revenue - a.revenue);
  }
}
