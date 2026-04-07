import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
export interface CreateUserDto {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;
    pin?: string;
}
export interface UpdateUserDto {
    name?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    isActive?: boolean;
    pin?: string;
}
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateUserDto): Promise<any>;
    findAll(params?: {
        role?: UserRole;
        isActive?: boolean;
    }): Promise<any>;
    findById(id: string): Promise<any>;
    findByEmail(email: string): Promise<any>;
    update(id: string, dto: UpdateUserDto): Promise<any>;
    resetPassword(id: string, newPassword: string): Promise<{
        message: string;
    }>;
    deactivate(id: string): Promise<any>;
    getOperators(): Promise<any>;
}
