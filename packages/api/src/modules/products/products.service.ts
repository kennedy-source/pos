import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Gender } from '@prisma/client';

export interface CreateProductDto {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  schoolId?: string;
  supplierId?: string;
  gender?: Gender;
  imageUrl?: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel?: number;
  notes?: string;
  isBundle?: boolean;
  variants?: CreateVariantDto[];
}

export interface CreateVariantDto {
  size?: string;
  color?: string;
  sku: string;
  barcode?: string;
  costPrice?: number;
  sellingPrice?: number;
  currentStock?: number;
  reorderLevel?: number;
  imageUrl?: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface ProductSearchParams {
  query?: string;
  categoryId?: string;
  schoolId?: string;
  gender?: Gender;
  isActive?: boolean;
  lowStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto, userId: string) {
    // Check SKU uniqueness
    const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException(`SKU "${dto.sku}" is already in use`);

    if (dto.barcode) {
      const barcodeExists = await this.prisma.product.findUnique({ where: { barcode: dto.barcode } });
      if (barcodeExists) throw new ConflictException(`Barcode "${dto.barcode}" is already in use`);
    }

    // Prepare variants - always create at least a default variant
    const variantsToCreate = dto.variants
      ? dto.variants.map((v) => ({
          size: v.size,
          color: v.color,
          sku: v.sku,
          barcode: v.barcode,
          costPrice: v.costPrice,
          sellingPrice: v.sellingPrice,
          currentStock: v.currentStock ?? 0,
          reorderLevel: v.reorderLevel,
          imageUrl: v.imageUrl,
        }))
      : [
          // Create a default variant with product-level pricing
          {
            size: null,
            color: null,
            sku: `${dto.sku}-DEFAULT`,
            barcode: null,
            costPrice: dto.costPrice,
            sellingPrice: dto.sellingPrice,
            currentStock: 0,
            reorderLevel: dto.reorderLevel ?? 5,
            imageUrl: dto.imageUrl,
          },
        ];

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        description: dto.description,
        categoryId: dto.categoryId,
        schoolId: dto.schoolId,
        supplierId: dto.supplierId,
        gender: dto.gender || 'UNISEX',
        imageUrl: dto.imageUrl,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        reorderLevel: dto.reorderLevel ?? 5,
        notes: dto.notes,
        isBundle: dto.isBundle ?? false,
        createdById: userId,
        variants: {
          create: variantsToCreate,
        },
      },
      include: {
        category: true,
        school: true,
        supplier: true,
        variants: true,
      },
    });

    return product;
  }

  async findAll(params: ProductSearchParams) {
    const {
      query,
      categoryId,
      schoolId,
      gender,
      isActive,
      lowStock,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
    } = params;

    const where: Prisma.ProductWhereInput = {};

    if (isActive !== undefined) where.isActive = isActive;
    if (categoryId) where.categoryId = categoryId;
    if (schoolId) where.schoolId = schoolId;
    if (gender) where.gender = gender;

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (lowStock) {
      where.variants = {
        some: {
          currentStock: { lte: this.prisma.productVariant.fields.reorderLevel as any },
        },
      };
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          school: { select: { id: true, name: true, code: true } },
          supplier: { select: { id: true, name: true } },
          variants: true,
          _count: { select: { saleItems: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        school: true,
        supplier: true,
        variants: true,
        createdBy: { select: { id: true, name: true } },
        inventoryTxns: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { performedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!product) throw new NotFoundException(`Product not found`);
    return product;
  }

  async findByBarcode(barcode: string) {
    // Check product barcode first
    let product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        variants: true,
      },
    });

    if (product) return { type: 'product', data: product };

    // Check variant barcode
    const variant = await this.prisma.productVariant.findUnique({
      where: { barcode },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
            school: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (variant) return { type: 'variant', data: variant };

    throw new NotFoundException(`No product found for barcode: ${barcode}`);
  }

  async findBySku(sku: string) {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        category: true,
        school: true,
        variants: true,
      },
    });

    if (!product) {
      // Try variant SKU
      const variant = await this.prisma.productVariant.findUnique({
        where: { sku },
        include: { product: { include: { category: true, school: true } } },
      });
      if (!variant) throw new NotFoundException(`No product/variant found for SKU: ${sku}`);
      return variant;
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    await this.findById(id); // ensure exists

    if (dto.sku) {
      const conflict = await this.prisma.product.findFirst({
        where: { sku: dto.sku, id: { not: id } },
      });
      if (conflict) throw new ConflictException(`SKU "${dto.sku}" is already in use`);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        description: dto.description,
        categoryId: dto.categoryId,
        schoolId: dto.schoolId,
        supplierId: dto.supplierId,
        gender: dto.gender,
        imageUrl: dto.imageUrl,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        reorderLevel: dto.reorderLevel,
        notes: dto.notes,
        isActive: (dto as any).isActive,
      },
      include: { category: true, school: true, variants: true },
    });
  }

  async addVariant(productId: string, dto: CreateVariantDto) {
    await this.findById(productId);

    const existing = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException(`Variant SKU "${dto.sku}" already exists`);

    return this.prisma.productVariant.create({
      data: {
        productId,
        size: dto.size,
        color: dto.color,
        sku: dto.sku,
        barcode: dto.barcode,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        currentStock: dto.currentStock ?? 0,
        reorderLevel: dto.reorderLevel,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async updateVariant(variantId: string, dto: Partial<CreateVariantDto>) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: dto,
    });
  }

  async getLowStockProducts() {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true },
      },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
            school: { select: { name: true } },
          },
        },
      },
    });

    return variants.filter((v) => {
      const reorder = v.reorderLevel ?? v.product.reorderLevel;
      return v.currentStock <= reorder;
    });
  }

  async getCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(name: string, description?: string) {
    return this.prisma.category.create({ data: { name, description } });
  }

  async getSchools() {
    return this.prisma.school.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSchool(data: {
    name: string;
    code: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
  }) {
    return this.prisma.school.create({ data });
  }

  async getStockValuation() {
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      include: { product: { select: { costPrice: true, sellingPrice: true } } },
    });

    let totalCostValue = 0;
    let totalRetailValue = 0;

    for (const v of variants) {
      const cost = Number(v.costPrice ?? v.product.costPrice);
      const retail = Number(v.sellingPrice ?? v.product.sellingPrice);
      totalCostValue += cost * v.currentStock;
      totalRetailValue += retail * v.currentStock;
    }

    return {
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
      totalVariants: variants.length,
      totalUnits: variants.reduce((sum, v) => sum + v.currentStock, 0),
    };
  }

  async deactivate(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
