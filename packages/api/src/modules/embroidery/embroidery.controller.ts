import {
  Controller, Get, Post, Put, Patch, Body,
  Param, Query, UseGuards, Request
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  EmbroideryService,
  CreateEmbroideryJobDto,
  UpdateJobStatusDto,
} from './embroidery.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, EmbroideryStatus, EmbroideryPriority } from '@prisma/client';

@ApiTags('embroidery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('embroidery')
export class EmbroideryController {
  constructor(private embroideryService: EmbroideryService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.EMBROIDERY_OPERATOR)
  create(@Body() dto: CreateEmbroideryJobDto, @Request() req) {
    return this.embroideryService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.embroideryService.findAll({
      status: query.status as EmbroideryStatus,
      operatorId: query.operatorId,
      customerId: query.customerId,
      schoolId: query.schoolId,
      priority: query.priority as EmbroideryPriority,
      overdueOnly: query.overdueOnly === 'true',
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    });
  }

  @Get('stats')
  getStats() {
    return this.embroideryService.getJobStats();
  }

  @Get('job/:jobNumber')
  findByJobNumber(@Param('jobNumber') jobNumber: string) {
    return this.embroideryService.findByJobNumber(jobNumber);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.embroideryService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: Partial<CreateEmbroideryJobDto>) {
    return this.embroideryService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(
    UserRole.ADMIN, UserRole.MANAGER,
    UserRole.EMBROIDERY_OPERATOR
  )
  updateStatus(@Param('id') id: string, @Body() dto: UpdateJobStatusDto, @Request() req) {
    return this.embroideryService.updateStatus(id, dto, req.user.id);
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  assignOperator(@Param('id') id: string, @Body() body: { operatorId: string }) {
    return this.embroideryService.assignOperator(id, body.operatorId);
  }
}
