import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    create(dto: CreateUserDto): Promise<any>;
    findAll(query: any): Promise<any>;
    getOperators(): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateUserDto): Promise<any>;
    resetPassword(id: string, body: {
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
    deactivate(id: string): Promise<any>;
}
