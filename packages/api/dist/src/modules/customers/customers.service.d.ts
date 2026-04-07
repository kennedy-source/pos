import { PrismaService } from '../../prisma/prisma.service';
export interface CreateCustomerDto {
    name: string;
    phone?: string;
    email?: string;
    schoolId?: string;
    creditLimit?: number;
    notes?: string;
}
export declare class CustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateCustomerDto): Promise<any>;
    findAll(params: {
        query?: string;
        schoolId?: string;
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
    findByPhone(phone: string): Promise<any>;
    update(id: string, dto: Partial<CreateCustomerDto>): Promise<any>;
    adjustCredit(id: string, amount: number, reason: string): Promise<any>;
}
