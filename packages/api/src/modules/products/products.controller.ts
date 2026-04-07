import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, UseGuards, Request,
  HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService, CreateProductDto, UpdateProductDto, CreateVariantDto } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STOREKEEPER)
  create(@Body() dto: CreateProductDto, @Request() req) {
    return this.productsService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.productsService.findAll({
      query: query.q,
      categoryId: query.categoryId,
      schoolId: query.schoolId,
      gender: query.gender,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : true,
      lowStock: query.lowStock === 'true',
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
      sortBy: query.sortBy || 'name',
      sortOrder: query.sortOrder || 'asc',
    });
  }

  @Get('low-stock')
  getLowStock() {
    return this.productsService.getLowStockProducts();
  }

  @Get('valuation')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getValuation() {
    return this.productsService.getStockValuation();
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get('sku/:sku')
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  @Get('categories')
  getCategories() {
    return this.productsService.getCategories();
  }

  @Post('categories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createCategory(@Body() body: { name: string; description?: string }) {
    return this.productsService.createCategory(body.name, body.description);
  }

  @Get('schools')
  getSchools() {
    return this.productsService.getSchools();
  }

  @Post('schools')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createSchool(@Body() body: any) {
    return this.productsService.createSchool(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STOREKEEPER)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Request() req) {
    return this.productsService.update(id, dto, req.user.id);
  }

  @Post(':id/variants')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STOREKEEPER)
  addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.productsService.addVariant(id, dto);
  }

  @Put('variants/:variantId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STOREKEEPER)
  updateVariant(@Param('variantId') variantId: string, @Body() dto: Partial<CreateVariantDto>) {
    return this.productsService.updateVariant(variantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.productsService.deactivate(id);
  }
}
