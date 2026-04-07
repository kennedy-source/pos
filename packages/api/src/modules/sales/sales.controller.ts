import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService, CreateSaleDto, CompleteSaleDto, ProcessReturnDto } from './sales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, SaleStatus, PaymentMethod } from '@prisma/client';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post('draft')
  createDraft(@Body() dto: CreateSaleDto, @Request() req) {
    return this.salesService.createDraft(dto, req.user.id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  completeSale(@Param('id') id: string, @Body() dto: CompleteSaleDto, @Request() req) {
    return this.salesService.completeSale(id, dto, req.user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelSale(@Param('id') id: string, @Body() body: { reason: string }, @Request() req) {
    return this.salesService.cancelSale(id, body.reason, req.user.id);
  }

  @Post('return')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  processReturn(@Body() dto: ProcessReturnDto, @Request() req) {
    return this.salesService.processReturn(dto, req.user.id);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.salesService.findAll({
      status: query.status as SaleStatus,
      cashierId: query.cashierId,
      customerId: query.customerId,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      paymentMethod: query.paymentMethod as PaymentMethod,
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    });
  }

  @Get('daily-summary')
  getDailySummary(@Query('date') date: string) {
    return this.salesService.getDailySummary(date ? new Date(date) : new Date());
  }

  @Get('receipt/:receiptNumber')
  findByReceipt(@Param('receiptNumber') receiptNumber: string) {
    return this.salesService.findByReceipt(receiptNumber);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findById(id);
  }

  @Post('mpesa/initiate')
  @HttpCode(HttpStatus.OK)
  initiateMpesa(@Body() body: { phone: string; amount: number; saleId: string }) {
    return this.salesService.initiateMpesaStkPush(body.phone, body.amount, body.saleId);
  }

  @Post('mpesa-callback')
  @HttpCode(HttpStatus.OK)
  mpesaCallback(@Body() body: any) {
    return this.salesService.handleMpesaCallback(body);
  }
}
