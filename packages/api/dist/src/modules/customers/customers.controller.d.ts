import { CustomersService, CreateCustomerDto } from './customers.service';
export declare class CustomersController {
    private customersService;
    constructor(customersService: CustomersService);
    create(dto: CreateCustomerDto): Promise<any>;
    findAll(query: any): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findByPhone(phone: string): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: Partial<CreateCustomerDto>): Promise<any>;
    adjustCredit(id: string, body: {
        amount: number;
        reason: string;
    }): Promise<any>;
}
