import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

@Injectable()
export class EmbroideryService {
  constructor(private prisma: PrismaService) {}

  private generateJobNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const seq = Math.floor(Math.random() * 9000) + 1000;
    return `EMB-${year}${month}-${seq}`;
  }

  async create(dto: CreateEmbroideryJobDto, createdById: string) {
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

  async updateStatus(jobId: string, dto: UpdateJobStatusDto, changedById: string) {
    const job = await this.prisma.embroideryJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Embroidery job not found');

    const validTransitions: Record<EmbroideryStatus, EmbroideryStatus[]> = {
      PENDING: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'PENDING', 'CANCELLED'],
      COMPLETED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[job.status].includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${job.status} to ${dto.status}`
      );
    }

    const updateData: any = { status: dto.status, updatedAt: new Date() };
    if (dto.status === 'IN_PROGRESS') updateData.startedAt = new Date();
    if (dto.status === 'COMPLETED') updateData.completedAt = new Date();
    if (dto.status === 'DELIVERED') updateData.deliveredAt = new Date();

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

  async assignOperator(jobId: string, operatorId: string) {
    return this.prisma.embroideryJob.update({
      where: { id: jobId },
      data: { operatorId },
      include: { operator: { select: { id: true, name: true } } },
    });
  }

  async findAll(params: {
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
  }) {
    const {
      status, operatorId, customerId, schoolId, priority,
      overdueOnly, fromDate, toDate, page = 1, limit = 20
    } = params;

    const where: any = {};
    if (status) where.status = status;
    if (operatorId) where.operatorId = operatorId;
    if (customerId) where.customerId = customerId;
    if (schoolId) where.schoolId = schoolId;
    if (priority) where.priority = priority;
    if (overdueOnly) {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] };
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
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

  async findById(id: string) {
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
    if (!job) throw new NotFoundException('Embroidery job not found');
    return job;
  }

  async findByJobNumber(jobNumber: string) {
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
    if (!job) throw new NotFoundException(`Job ${jobNumber} not found`);
    return job;
  }

  async update(id: string, dto: Partial<CreateEmbroideryJobDto>) {
    const job = await this.prisma.embroideryJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Embroidery job not found');

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
}
