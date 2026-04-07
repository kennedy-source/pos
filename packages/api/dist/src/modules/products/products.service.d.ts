import { PrismaService } from '../../prisma/prisma.service';
import { Gender } from '@prisma/client';
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
export interface UpdateProductDto extends Partial<CreateProductDto> {
}
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
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateProductDto, userId: string): Promise<any>;
    findAll(params: ProductSearchParams): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: string): Promise<any>;
    findByBarcode(barcode: string): Promise<{
        type: string;
        data: any;
    }>;
    findBySku(sku: string): Promise<any>;
    update(id: string, dto: UpdateProductDto, userId: string): Promise<any>;
    addVariant(productId: string, dto: CreateVariantDto): Promise<any>;
    updateVariant(variantId: string, dto: Partial<CreateVariantDto>): Promise<any>;
    getLowStockProducts(): Promise<any>;
    getCategories(): Promise<any>;
    createCategory(name: string, description?: string): Promise<any>;
    getSchools(): Promise<any>;
    createSchool(data: {
        name: string;
        code: string;
        address?: string;
        contactName?: string;
        contactPhone?: string;
    }): Promise<any>;
    getStockValuation(): Promise<{
        totalCostValue: number;
        totalRetailValue: number;
        potentialProfit: number;
        totalVariants: any;
        totalUnits: any;
    }>;
    deactivate(id: string): Promise<any>;
}
