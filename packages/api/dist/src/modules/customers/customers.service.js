"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        if (dto.phone) {
            const exists = await this.prisma.customer.findUnique({ where: { phone: dto.phone } });
            if (exists)
                throw new common_1.ConflictException(`Customer with phone ${dto.phone} already exists`);
        }
        return this.prisma.customer.create({
            data: { ...dto },
            include: { school: { select: { id: true, name: true } } },
        });
    }
    async findAll(params) {
        const { query, schoolId, page = 1, limit = 20 } = params;
        const where = { isActive: true };
        if (schoolId)
            where.schoolId = schoolId;
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query } },
                { email: { contains: query, mode: 'insensitive' } },
            ];
        }
        const [total, customers] = await Promise.all([
            this.prisma.customer.count({ where }),
            this.prisma.customer.findMany({
                where,
                include: { school: { select: { id: true, name: true } } },
                orderBy: { name: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);
        return { data: customers, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findById(id) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                school: true,
                sales: {
                    where: { status: 'COMPLETED' },
                    orderBy: { completedAt: 'desc' },
                    take: 10,
                    include: { _count: { select: { items: true } }, payments: true },
                },
                embroideryJobs: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        return customer;
    }
    async findByPhone(phone) {
        const customer = await this.prisma.customer.findUnique({
            where: { phone },
            include: { school: { select: { id: true, name: true } } },
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        return customer;
    }
    async update(id, dto) {
        await this.findById(id);
        return this.prisma.customer.update({
            where: { id },
            data: dto,
            include: { school: { select: { id: true, name: true } } },
        });
    }
    async adjustCredit(id, amount, reason) {
        await this.findById(id);
        return this.prisma.customer.update({
            where: { id },
            data: { creditBalance: { increment: amount } },
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map