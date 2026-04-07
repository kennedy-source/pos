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
exports.EmbroideryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let EmbroideryService = class EmbroideryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateJobNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const seq = Math.floor(Math.random() * 9000) + 1000;
        return `EMB-${year}${month}-${seq}`;
    }
    async create(dto, createdById) {
        const totalCost = dto.totalItems * dto.pricePerItem;
        const depositPaid = dto.depositPaid || 0;
        const balanceDue = totalCost - depositPaid;
        return this.prisma.embroideryJob.create({
            data: {
                jobNumber: this.generateJobNumber(),
                customerId: dto.customerId,
                schoolId: dto.schoolId,
                saleId: dto.saleId,
                operatorId: dto.operatorId,
                customerName: dto.customerName,
                customerPhone: dto.customerPhone,
                designName: dto.designName,
                designRef: dto.designRef,
                threadColors: dto.threadColors,
                totalItems: dto.totalItems,
                pricePerItem: dto.pricePerItem,
                totalCost,
                depositPaid,
                balanceDue,
                priority: dto.priority || 'NORMAL',
                dueDate: new Date(dto.dueDate),
                notes: dto.notes,
                internalNotes: dto.internalNotes,
                status: 'PENDING',
                items: {
                    create: dto.items.map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        garmentType: item.garmentType,
                        quantity: item.quantity,
                        size: item.size,
                        color: item.color,
                        logoPosition: item.logoPosition,
                        notes: item.notes,
                    })),
                },
                statusHistory: {
                    create: {
                        toStatus: 'PENDING',
                        changedById: createdById,
                        notes: 'Job created',
                    },
                },
            },
            include: {
                items: { include: { product: true, variant: true } },
                customer: true,
                school: true,
                operator: { select: { id: true, name: true } },
                statusHistory: { orderBy: { createdAt: 'desc' } },
            },
        });
    }
    async updateStatus(jobId, dto, changedById) {
        const job = await this.prisma.embroideryJob.findUnique({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('Embroidery job not found');
        const validTransitions = {
            PENDING: ['IN_PROGRESS', 'CANCELLED'],
            IN_PROGRESS: ['COMPLETED', 'PENDING', 'CANCELLED'],
            COMPLETED: ['DELIVERED'],
            DELIVERED: [],
            CANCELLED: [],
        };
        if (!validTransitions[job.status].includes(dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition from ${job.status} to ${dto.status}`);
        }
        const updateData = { status: dto.status, updatedAt: new Date() };
        if (dto.status === 'IN_PROGRESS')
            updateData.startedAt = new Date();
        if (dto.status === 'COMPLETED')
            updateData.completedAt = new Date();
        if (dto.status === 'DELIVERED')
            updateData.deliveredAt = new Date();
        const [updatedJob] = await this.prisma.$transaction([
            this.prisma.embroideryJob.update({
                where: { id: jobId },
                data: updateData,
                include: {
                    items: true,
                    customer: true,
                    operator: { select: { id: true, name: true } },
                    statusHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
                },
            }),
            this.prisma.embroideryStatusLog.create({
                data: {
                    jobId,
                    fromStatus: job.status,
                    toStatus: dto.status,
                    changedById,
                    notes: dto.notes,
                },
            }),
        ]);
        return updatedJob;
    }
    async assignOperator(jobId, operatorId) {
        return this.prisma.embroideryJob.update({
            where: { id: jobId },
            data: { operatorId },
            include: { operator: { select: { id: true, name: true } } },
        });
    }
    async findAll(params) {
        const { status, operatorId, customerId, schoolId, priority, overdueOnly, fromDate, toDate, page = 1, limit = 20 } = params;
        const where = {};
        if (status)
            where.status = status;
        if (operatorId)
            where.operatorId = operatorId;
        if (customerId)
            where.customerId = customerId;
        if (schoolId)
            where.schoolId = schoolId;
        if (priority)
            where.priority = priority;
        if (overdueOnly) {
            where.dueDate = { lt: new Date() };
            where.status = { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] };
        }
        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate)
                where.createdAt.gte = fromDate;
            if (toDate)
                where.createdAt.lte = toDate;
        }
        const [total, jobs] = await Promise.all([
            this.prisma.embroideryJob.count({ where }),
            this.prisma.embroideryJob.findMany({
                where,
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    school: { select: { id: true, name: true } },
                    operator: { select: { id: true, name: true } },
                    items: { include: { product: { select: { name: true } } } },
                    _count: { select: { items: true } },
                },
                orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);
        return { data: jobs, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findById(id) {
        const job = await this.prisma.embroideryJob.findUnique({
            where: { id },
            include: {
                items: { include: { product: true, variant: true } },
                customer: true,
                school: true,
                operator: { select: { id: true, name: true } },
                sale: { select: { id: true, receiptNumber: true, totalAmount: true } },
                statusHistory: {
                    orderBy: { createdAt: 'desc' },
                    include: { changedBy: undefined },
                },
            },
        });
        if (!job)
            throw new common_1.NotFoundException('Embroidery job not found');
        return job;
    }
    async findByJobNumber(jobNumber) {
        const job = await this.prisma.embroideryJob.findUnique({
            where: { jobNumber },
            include: {
                items: { include: { product: true, variant: true } },
                customer: true,
                school: true,
                operator: { select: { id: true, name: true } },
                statusHistory: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!job)
            throw new common_1.NotFoundException(`Job ${jobNumber} not found`);
        return job;
    }
    async update(id, dto) {
        const job = await this.prisma.embroideryJob.findUnique({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('Embroidery job not found');
        const totalCost = (dto.totalItems || job.totalItems) * (dto.pricePerItem ? Number(dto.pricePerItem) : Number(job.pricePerItem));
        const depositPaid = dto.depositPaid !== undefined ? dto.depositPaid : Number(job.depositPaid);
        return this.prisma.embroideryJob.update({
            where: { id },
            data: {
                ...dto,
                totalCost,
                depositPaid,
                balanceDue: totalCost - depositPaid,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            },
            include: {
                items: true,
                customer: true,
                school: true,
                operator: { select: { id: true, name: true } },
            },
        });
    }
    async getJobStats() {
        const [pending, inProgress, completed, delivered, overdue] = await Promise.all([
            this.prisma.embroideryJob.count({ where: { status: 'PENDING' } }),
            this.prisma.embroideryJob.count({ where: { status: 'IN_PROGRESS' } }),
            this.prisma.embroideryJob.count({ where: { status: 'COMPLETED' } }),
            this.prisma.embroideryJob.count({ where: { status: 'DELIVERED' } }),
            this.prisma.embroideryJob.count({
                where: {
                    dueDate: { lt: new Date() },
                    status: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] },
                },
            }),
        ]);
        const revenue = await this.prisma.embroideryJob.aggregate({
            where: { status: { in: ['COMPLETED', 'DELIVERED'] } },
            _sum: { totalCost: true, depositPaid: true },
        });
        return {
            pending, inProgress, completed, delivered, overdue,
            totalRevenue: Number(revenue._sum.totalCost || 0),
            totalCollected: Number(revenue._sum.depositPaid || 0),
        };
    }
};
exports.EmbroideryService = EmbroideryService;
exports.EmbroideryService = EmbroideryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmbroideryService);
//# sourceMappingURL=embroidery.service.js.map