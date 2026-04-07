"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing)
            throw new common_1.ConflictException(`Email ${dto.email} is already registered`);
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const pinHash = dto.pin ? await bcrypt.hash(dto.pin, 10) : undefined;
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                passwordHash,
                pin: pinHash,
                role: dto.role,
            },
            select: {
                id: true, name: true, email: true, phone: true,
                role: true, isActive: true, createdAt: true,
            },
        });
        return user;
    }
    async findAll(params) {
        const where = {};
        if (params?.role)
            where.role = params.role;
        if (params?.isActive !== undefined)
            where.isActive = params.isActive;
        return this.prisma.user.findMany({
            where,
            select: {
                id: true, name: true, email: true, phone: true,
                role: true, isActive: true, lastLoginAt: true, createdAt: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true, name: true, email: true, phone: true,
                role: true, isActive: true, lastLoginAt: true, createdAt: true,
                _count: { select: { sales: true } },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({ where: { email } });
    }
    async update(id, dto) {
        await this.findById(id);
        const updateData = { ...dto };
        if (dto.pin) {
            updateData.pin = await bcrypt.hash(dto.pin, 10);
        }
        return this.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true, name: true, email: true, phone: true,
                role: true, isActive: true, updatedAt: true,
            },
        });
    }
    async resetPassword(id, newPassword) {
        if (newPassword.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters');
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id },
            data: { passwordHash },
        });
        await this.prisma.refreshToken.updateMany({
            where: { userId: id },
            data: { revokedAt: new Date() },
        });
        return { message: 'Password reset successfully' };
    }
    async deactivate(id) {
        return this.prisma.user.update({
            where: { id },
            data: { isActive: false },
            select: { id: true, name: true, isActive: true },
        });
    }
    async getOperators() {
        return this.prisma.user.findMany({
            where: { role: client_1.UserRole.EMBROIDERY_OPERATOR, isActive: true },
            select: { id: true, name: true, email: true },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map