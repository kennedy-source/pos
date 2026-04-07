import { EmbroideryService, CreateEmbroideryJobDto, UpdateJobStatusDto } from './embroidery.service';
export declare class EmbroideryController {
    private embroideryService;
    constructor(embroideryService: EmbroideryService);
    create(dto: CreateEmbroideryJobDto, req: any): Promise<any>;
    findAll(query: any): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getStats(): Promise<{
        pending: any;
        inProgress: any;
        completed: any;
        delivered: any;
        overdue: any;
        totalRevenue: number;
        totalCollected: number;
    }>;
    findByJobNumber(jobNumber: string): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: Partial<CreateEmbroideryJobDto>): Promise<any>;
    updateStatus(id: string, dto: UpdateJobStatusDto, req: any): Promise<any>;
    assignOperator(id: string, body: {
        operatorId: string;
    }): Promise<any>;
}
