import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async portfolioSummary(tenantId: string) {
    const [activeLoans, totalBorrowers, overdueCount, totalCollected] = await Promise.all([
      this.prisma.loan.aggregate({
        where: { tenantId, status: 'active' },
        _sum: { currentBalance: true },
        _count: true,
      }),
      this.prisma.borrower.count({ where: { tenantId, status: 'active' } }),
      this.prisma.loanInstallment.count({
        where: { loan: { tenantId }, status: 'overdue' },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: 'accepted' },
        _sum: { amount: true },
      }),
    ]);

    return {
      activeLoansCount: activeLoans._count,
      totalOutstanding: activeLoans._sum.currentBalance ?? 0,
      activeBorrowers: totalBorrowers,
      overdueInstallments: overdueCount,
      totalCollected: totalCollected._sum.amount ?? 0,
    };
  }

  async paymentsByPeriod(tenantId: string, from: string, to: string) {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        status: 'accepted',
        paymentDate: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      include: {
        loan: {
          select: {
            borrower: { select: { firstName: true, lastName: true } },
          },
        },
        allocations: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async debtReport(tenantId: string) {
    return this.prisma.loan.findMany({
      where: { tenantId, status: 'active' },
      select: {
        id: true,
        currentBalance: true,
        principalAmount: true,
        interestRate: true,
        startDate: true,
        borrower: {
          select: { id: true, firstName: true, lastName: true, documentNum: true, phone: true },
        },
        installments: {
          where: { status: { in: ['pending', 'partial', 'overdue'] } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
      orderBy: { currentBalance: 'desc' },
    });
  }

  async clientsReport(tenantId: string) {
    return this.prisma.borrower.findMany({
      where: { tenantId },
      include: {
        _count: { select: { loans: true } },
        loans: {
          where: { status: 'active' },
          select: { currentBalance: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });
  }
}
