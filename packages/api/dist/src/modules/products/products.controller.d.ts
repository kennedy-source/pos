import { ProductsService, CreateProductDto, UpdateProductDto, CreateVariantDto } from './products.service';
export declare class ProductsController {
    private productsService;
    constructor(productsService: ProductsService);
    create(dto: CreateProductDto, req: any): Promise<any>;
    findAll(query: any): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getLowStock(): Promise<any>;
    getValuation(): Promise<{
        totalCostValue: number;
        totalRetailValue: number;
        potentialProfit: number;
        totalVariants: any;
        totalUnits: any;
    }>;
    findByBarcode(barcode: string): Promise<{
        type: string;
        data: any;
    }>;
    findBySku(sku: string): Promise<any>;
    getCategories(): Promise<any>;
    createCategory(body: {
        name: string;
        description?: string;
    }): Promise<any>;
    getSchools(): Promise<any>;
    createSchool(body: any): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateProductDto, req: any): Promise<any>;
    addVariant(id: string, dto: CreateVariantDto): Promise<any>;
    updateVariant(variantId: string, dto: Partial<CreateVariantDto>): Promise<any>;
    deactivate(id: string): Promise<any>;
}
