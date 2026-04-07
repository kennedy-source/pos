import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('sales')
  getSales(@Query() query: any) {
    const fromDate = query.fromDate ? new Date(query.fromDate) : new Date(new Date().setDate(1));
    const toDate = query.toDate ? new Date(query.toDate) : new Date();
    return this.reportsService.getSalesReport({ fromDate, toDate, groupBy: query.groupBy });
  }

  @Get('inventory')
  getInventory() {
    return this.reportsService.getInventoryReport();
  }

  @Get('embroidery')
  getEmbroidery(@Query() query: any) {
    const fromDate = query.fromDate ? new Date(query.fromDate) : new Date(new Date().setDate(1));
    const toDate = query.toDate ? new Date(query.toDate) : new Date();
    return this.reportsService.getEmbroideryReport({ fromDate, toDate });
  }

  @Get('customers/top')
  getTopCustomers(@Query('limit') limit: string) {
    return this.reportsService.getTopCustomers(parseInt(limit) || 10);
  }

  @Get('sales/by-cashier')
  getSalesByCashier(@Query() query: any) {
    const fromDate = query.fromDate ? new Date(query.fromDate) : new Date(new Date().setDate(1));
    const toDate = query.toDate ? new Date(query.toDate) : new Date();
    return this.reportsService.getSalesByCashier(fromDate, toDate);
  }
}
