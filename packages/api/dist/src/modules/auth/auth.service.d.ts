import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<User | null>;
    validatePin(userId: string, pin: string): Promise<User | null>;
    login(user: User, ipAddress?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: User;
    }>;
    refresh(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: User;
    }>;
    logout(userId: string, refreshToken: string): Promise<void>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    private sanitizeUser;
    private auditLog;
}
