import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { InstallmentSchedulerService } from '../loans/installment-scheduler.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private installments: InstallmentSchedulerService,
  ) {}

  async portfolioSummary(tenantId: string) {
    const now = new Date();
    const monthsBack = 5;
    const seriesStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));

    const activeLoanIds = await this.prisma.loan.findMany({
      where: { tenantId, status: 'active', currentBalance: { gt: 0 } },
      select: { id: true },
    });
    for (const loan of activeLoanIds) {
      await this.installments.ensureAccruedInstallments(loan.id, now);
    }

    const [
      activeLoans,
      totalBorrowers,
      overdueLoans,
      overdueInstallments,
      totalCollected,
      recentPayments,
      allocations,
      openInterestRows,
    ] = await Promise.all([
        this.prisma.loan.aggregate({
          where: { tenantId, status: 'active' },
          _sum: { currentBalance: true, principalAmount: true },
          _count: true,
        }),
        this.prisma.borrower.count({ where: { tenantId, status: 'active' } }),
        this.prisma.loan.count({
          where: {
            tenantId,
            status: 'active',
            installments: { some: { status: 'overdue' } },
          },
        }),
        this.prisma.loanInstallment.count({
          where: { loan: { tenantId, status: 'active' }, status: 'overdue' },
        }),
        this.prisma.payment.aggregate({
          where: { tenantId, status: 'accepted' },
          _sum: { amount: true },
        }),
        this.prisma.payment.findMany({
          where: {
            tenantId,
            status: 'accepted',
            paymentDate: { gte: seriesStart },
          },
          select: { amount: true, paymentDate: true },
        }),
        this.prisma.paymentAllocation.aggregate({
          where: { payment: { tenantId, status: 'accepted' } },
          _sum: { toInterest: true, toLateFee: true, toPrincipal: true },
        }),
        this.prisma.loanInstallment.findMany({
          where: {
            status: { in: ['pending', 'partial', 'overdue'] },
            loan: { tenantId, status: 'active' },
          },
          select: { expectedInterest: true, paidInterest: true },
        }),
      ]);

    const totalPendingInterest = openInterestRows.reduce(
      (sum, row) => sum + Math.max(0, row.expectedInterest - row.paidInterest),
      0,
    );
    const monthKeys: string[] = [];
    for (let i = monthsBack; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }

    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const collectedByKey = new Map<string, number>();
    for (const key of monthKeys) collectedByKey.set(key, 0);
    for (const p of recentPayments) {
      const d = new Date(p.paymentDate);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (collectedByKey.has(key)) {
        collectedByKey.set(key, (collectedByKey.get(key) ?? 0) + p.amount);
      }
    }

    const collectionsByMonth = monthKeys.map((key) => {
      const [, mm] = key.split('-');
      return {
        month: key,
        label: monthLabels[Number(mm) - 1],
        amount: collectedByKey.get(key) ?? 0,
      };
    });

    return {
      activeLoansCount: activeLoans._count,
      totalOutstanding: activeLoans._sum.currentBalance ?? 0,
      totalPrincipal: activeLoans._sum.principalAmount ?? 0,
      activeBorrowers: totalBorrowers,
      /** Créditos activos con al menos un ciclo de interés vencido (KPI de dashboard). */
      overdueLoans,
      /** Ciclos internos vencidos; no mostrar como “cuotas” en UI. */
      overdueInstallments,
      /** Suma del interés pendiente de todos los ciclos abiertos. */
      totalPendingInterest,
      totalCollected: totalCollected._sum.amount ?? 0,
      collectionsByMonth,
      allocationTotals: {
        interest: allocations._sum.toInterest ?? 0,
        lateFee: allocations._sum.toLateFee ?? 0,
        principal: allocations._sum.toPrincipal ?? 0,
      },
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
