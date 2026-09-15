import { Injectable, NotFoundException } from '@nestjs/common';
import { InstallmentStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.module';

import { AuditService } from '../audit/audit.service';

import { InstallmentSchedulerService } from './installment-scheduler.service';

import { CreateLoanDto } from './dto/loan.dto';
import { LoanDebtSummary } from './loan-debt.types';
import { calculateLateFee } from '../../common/utils/money.util';
import {
  chargeableLateDays,
  daysOverdue,
  expectedInstallmentCount,
  lateFeeRulesFromJson,
  parseDateOnly,
} from '../../common/utils/loan-cycle.util';

@Injectable()
export class LoansService {

  constructor(

    private prisma: PrismaService,

    private audit: AuditService,

    private installments: InstallmentSchedulerService,

  ) {}



  private openInstallmentInclude = {
    where: {
      status: {
        in: [
          InstallmentStatus.pending,
          InstallmentStatus.partial,
          InstallmentStatus.overdue,
        ],
      },
    },
    orderBy: { dueDate: 'asc' as const },
    take: 1,
    select: {
      installmentNumber: true,
      dueDate: true,
      expectedInterest: true,
      paidInterest: true,
      status: true,
    },
  };

  findAll(tenantId: string) {
    return this.prisma.loan.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: { select: { id: true, firstName: true, lastName: true, documentNum: true } },
        product: { select: { id: true, name: true } },
        installments: this.openInstallmentInclude,
      },
    });
  }



  async findOne(tenantId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, tenantId },
      include: {
        borrower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentType: true,
            documentNum: true,
            phone: true,
          },
        },
        product: { select: { id: true, name: true } },
        term: true,
        installments: {
          orderBy: { installmentNumber: 'asc' },
          include: {
            overdueEvents: { orderBy: { detectedAt: 'asc' } },
          },
        },
        balanceEvents: { orderBy: { createdAt: 'asc' } },
        payments: {
          orderBy: { paymentDate: 'asc' },
          include: {
            allocations: true,
            recordedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!loan) throw new NotFoundException('Préstamo no encontrado');
    return loan;
  }



  async create(tenantId: string, dto: CreateLoanDto, userId: string, ip?: string) {

    const product = dto.productId
      ? await this.prisma.loanProduct.findFirst({
          where: { id: dto.productId, tenantId },
          include: { lateRules: true },
        })
      : await this.prisma.loanProduct.findFirst({
          where: { tenantId, isActive: true },
          include: { lateRules: true },
          orderBy: { createdAt: 'asc' },
        });

    if (!product) {
      throw new NotFoundException(
        'No hay un producto de crédito configurado para el tenant. Crea uno en productos o seed.',
      );
    }

    const borrower = await this.prisma.borrower.findFirst({
      where: { id: dto.borrowerId, tenantId },
    });

    if (!borrower) throw new NotFoundException('Prestatario no encontrado');

    const rate = dto.interestRate;
    const paymentFrequency = dto.paymentFrequency;
    const startDate = new Date(dto.startDate);

    const loan = await this.prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          tenantId,
          borrowerId: dto.borrowerId,
          productId: product.id,
          principalAmount: dto.principalAmount,
          currentBalance: dto.principalAmount,
          interestRate: rate,
          paymentFrequency,
          startDate,
          endDate: null,
        },
      });

      await tx.loanTerm.create({
        data: {
          loanId: newLoan.id,
          principalAmount: dto.principalAmount,
          interestRate: rate,
          interestMethod: product.interestMethod,
          paymentFrequency,
          lateFeeRules: product.lateRules[0] || {},
        },
      });

      await tx.loanBalanceEvent.create({
        data: {
          loanId: newLoan.id,
          eventType: 'disbursement',
          amount: dto.principalAmount,
          balanceAfter: dto.principalAmount,
          description: 'Desembolso inicial',
        },
      });

      return newLoan;
    });

    await this.installments.createFirstInstallment(
      loan.id,
      startDate,
      dto.principalAmount,
      rate,
      paymentFrequency,
    );



    await this.audit.log({

      tenantId,

      userId,

      entityType: 'loan',

      entityId: loan.id,

      action: 'create',

      newValues: dto as any,

      ipAddress: ip,

    });



    return this.findOne(tenantId, loan.id);

  }

  async lastMoraSettledThrough(loanId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        loanId,
        status: 'accepted',
        allocations: { some: { toLateFee: { gt: 0 } } },
      },
      orderBy: { paymentDate: 'desc' },
      select: { paymentDate: true },
    });
    return payment ? parseDateOnly(payment.paymentDate) : null;
  }

  getBorrowerLoans(tenantId: string, borrowerId: string) {

    return this.prisma.loan.findMany({

      where: { tenantId, borrowerId },

      include: {

        installments: {

          where: { status: { in: ['pending', 'partial', 'overdue'] } },

          orderBy: { dueDate: 'asc' },

          take: 5,

        },

      },

    });

  }

  async getDebtSummary(tenantId: string, loanId: string, asOf?: string): Promise<LoanDebtSummary> {
    await this.installments.ensureAccruedInstallments(loanId, asOf ? parseDateOnly(asOf) : new Date());

    const loan = await this.prisma.loan.findFirst({
      where: { id: loanId, tenantId },
      include: {
        borrower: { select: { firstName: true, lastName: true } },
        term: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (!loan) throw new NotFoundException('Préstamo no encontrado');

    const asOfDate = asOf ? parseDateOnly(asOf) : parseDateOnly(new Date());
    const needed = expectedInstallmentCount(
      parseDateOnly(loan.startDate),
      asOfDate,
      loan.paymentFrequency,
    );
    const rules = lateFeeRulesFromJson(loan.term?.lateFeeRules);
    const dueCycles = loan.installments.filter((item) => item.installmentNumber <= needed);
    const unpaidCycles = dueCycles.filter((item) => item.expectedInterest - item.paidInterest > 0);
    const pendingInterest = unpaidCycles.reduce(
      (sum, item) => sum + Math.max(0, item.expectedInterest - item.paidInterest),
      0,
    );
    const current = unpaidCycles[0] ?? dueCycles[dueCycles.length - 1] ?? null;
    const lateDays = current
      ? daysOverdue(parseDateOnly(current.dueDate), asOfDate, rules.graceDays)
      : 0;
    const settledThrough = await this.lastMoraSettledThrough(loan.id);
    const newLateDays = current
      ? chargeableLateDays(
          parseDateOnly(current.dueDate),
          asOfDate,
          rules.graceDays,
          settledThrough,
        )
      : 0;
    const isOverdue = pendingInterest > 0 && lateDays > 0;
    const canChargeLateFee = isOverdue && newLateDays > 0;
    const alreadyChargedThisEpisode = Boolean(
      settledThrough && current && newLateDays < lateDays,
    );
    const suggestedLateFee = canChargeLateFee
      ? calculateLateFee(
          pendingInterest,
          rules.dailyRate,
          newLateDays,
          alreadyChargedThisEpisode ? 0 : rules.fixedPenalty,
        )
      : 0;

    const principalBalance = loan.currentBalance;
    const minimumDueThisPeriod = pendingInterest;
    const totalDebt = principalBalance + pendingInterest;

    return {
      loanId: loan.id,
      borrowerName: `${loan.borrower.firstName} ${loan.borrower.lastName}`,
      principalBalance,
      pendingInterest,
      pendingLateFee: 0,
      suggestedLateFee,
      lateFeeDailyRate: rules.dailyRate,
      lateFeeDailyPercent: rules.dailyRate * 100,
      graceDays: rules.graceDays,
      fixedPenalty: rules.fixedPenalty,
      minimumDueThisPeriod,
      totalDebt,
      cutoffDate: current ? current.dueDate.toISOString() : null,
      isOverdue,
      daysOverdue: isOverdue ? lateDays : 0,
      chargeableLateDays: canChargeLateFee ? newLateDays : 0,
      daysAlreadyCharged: isOverdue ? Math.max(0, lateDays - newLateDays) : 0,
      canChargeLateFee,
      moraSettledOn: settledThrough ? settledThrough.toISOString() : null,
      unpaidCycles: unpaidCycles.length,
      currentInstallment: current
        ? {
            number: current.installmentNumber,
            dueDate: current.dueDate.toISOString(),
            expectedInterest: current.expectedInterest,
            paidInterest: current.paidInterest,
            interestRemaining: Math.max(0, current.expectedInterest - current.paidInterest),
          }
        : null,
    };
  }

}

