import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  schoolId?: string;
  creditLimit?: number;
  notes?: string;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    if (dto.phone) {
      const exists = await this.prisma.customer.findUnique({ where: { phone: dto.phone } });
      if (exists) throw new ConflictException(`Customer with phone ${dto.phone} already exists`);
    }
    return this.prisma.customer.create({
      data: { ...dto },
      include: { school: { select: { id: true, name: true } } },
    });
  }

  async findAll(params: { query?: string; schoolId?: string; page?: number; limit?: number }) {
    const { query, schoolId, page = 1, limit = 20 } = params;
    const where: any = { isActive: true };
    if (schoolId) where.schoolId = schoolId;
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

  async findById(id: string) {
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
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByPhone(phone: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      include: { school: { select: { id: true, name: true } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, dto: Partial<CreateCustomerDto>) {
    await this.findById(id);
    return this.prisma.customer.update({
      where: { id },
      data: dto,
      include: { school: { select: { id: true, name: true } } },
    });
  }

  async adjustCredit(id: string, amount: number, reason: string) {
    await this.findById(id);
    return this.prisma.customer.update({
      where: { id },
      data: { creditBalance: { increment: amount } },
    });
  }
}
