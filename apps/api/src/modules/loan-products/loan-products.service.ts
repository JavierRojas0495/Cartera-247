import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { CreateLoanProductDto, UpdateLoanProductDto } from './dto/loan-product.dto';

@Injectable()
export class LoanProductsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.loanProduct.findMany({
      where: { tenantId },
      include: { lateRules: true },
      orderBy: { name: 'asc' },
    });
  }

  findOne(tenantId: string, id: string) {
    return this.prisma.loanProduct.findFirst({
      where: { id, tenantId },
      include: { lateRules: true },
    });
  }

  create(tenantId: string, dto: CreateLoanProductDto) {
    return this.prisma.loanProduct.create({
      data: {
        tenantId,
        name: dto.name,
        interestMethod: dto.interestMethod,
        defaultRate: dto.defaultRate,
        paymentFrequency: dto.paymentFrequency,
        lateRules: {
          create: {
            graceDays: dto.graceDays ?? 0,
            dailyRate: dto.dailyRate ?? 0,
            fixedPenalty: dto.fixedPenalty ?? 0,
            requiresApproval: dto.requiresApproval ?? true,
          },
        },
      },
      include: { lateRules: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateLoanProductDto) {
    const product = await this.prisma.loanProduct.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    return this.prisma.loanProduct.update({
      where: { id },
      data: dto,
      include: { lateRules: true },
    });
  }
}
