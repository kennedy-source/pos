import {
  Controller, Get, Post, Body, Query, UseGuards, Request, Param
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService, StockAdjustmentDto, BulkStockInDto } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, StockTransactionType } from '@prisma/client';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post('adjust')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STOREKEEPER)
  adjust(@Body() dto: StockAdjustmentDto, @Request() req) {
    return this.inventoryService.adjustStock(dto, req.user.id);
  }

  @Post('bulk-stock-in')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STOREKEEPER)
  bulkStockIn(@Body() dto: BulkStockInDto, @Request() req) {
    return this.inventoryService.bulkStockIn(dto, req.user.id);
  }

  @Get('transactions')
  getTransactions(@Query() query: any) {
    return this.inventoryService.getTransactionHistory({
      productId: query.productId,
      variantId: query.variantId,
      type: query.type as StockTransactionType,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 30,
    });
  }

  @Get('alerts')
  getAlerts() {
    return this.inventoryService.getStockAlerts();
  }

  @Get('summary')
  getSummary() {
    return this.inventoryService.getInventorySummary();
  }
}
