import { PrismaService } from '../../prisma/prisma.service';
import { EmbroideryStatus, EmbroideryPriority } from '@prisma/client';
export interface CreateEmbroideryJobDto {
    customerId?: string;
    schoolId?: string;
    saleId?: string;
    operatorId?: string;
    customerName: string;
    customerPhone?: string;
    designName: string;
    designRef?: string;
    threadColors: string;
    totalItems: number;
    pricePerItem: number;
    depositPaid?: number;
    priority?: EmbroideryPriority;
    dueDate: string;
    notes?: string;
    internalNotes?: string;
    items: CreateEmbroideryJobItemDto[];
}
export interface CreateEmbroideryJobItemDto {
    productId?: string;
    variantId?: string;
    garmentType: string;
    quantity: number;
    size?: string;
    color?: string;
    logoPosition?: string;
    notes?: string;
}
export interface UpdateJobStatusDto {
    status: EmbroideryStatus;
    notes?: string;
}
export declare class EmbroideryService {
    private prisma;
    constructor(prisma: PrismaService);
    private generateJobNumber;
    create(dto: CreateEmbroideryJobDto, createdById: string): Promise<any>;
    updateStatus(jobId: string, dto: UpdateJobStatusDto, changedById: string): Promise<any>;
    assignOperator(jobId: string, operatorId: string): Promise<any>;
    findAll(params: {
        status?: EmbroideryStatus;
        operatorId?: string;
        customerId?: string;
        schoolId?: string;
        priority?: EmbroideryPriority;
        overdueOnly?: boolean;
        fromDate?: Date;
        toDate?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: string): Promise<any>;
    findByJobNumber(jobNumber: string): Promise<any>;
    update(id: string, dto: Partial<CreateEmbroideryJobDto>): Promise<any>;
    getJobStats(): Promise<{
        pending: any;
        inProgress: any;
        completed: any;
        delivered: any;
        overdue: any;
        totalRevenue: number;
        totalCollected: number;
    }>;
}
