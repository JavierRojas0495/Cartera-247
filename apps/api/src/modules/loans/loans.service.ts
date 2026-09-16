import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InstallmentStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.module';

import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';

import { InstallmentSchedulerService } from './installment-scheduler.service';

import { CreateLoanDto, UpdateLoanDto } from './dto/loan.dto';
import { LoanDebtSummary } from './loan-debt.types';
import { calculateLateFee, calculatePeriodInterest } from '../../common/utils/money.util';
import {
  chargeableLateDays,
  daysOverdue,
  expectedInstallmentCount,
  lateFeeRulesFromJson,
  parseDateOnly,
} from '../../common/utils/loan-cycle.util';
import { generateLoanCode } from '../../common/utils/loan-code.util';

@Injectable()
export class LoansService {

  constructor(

    private prisma: PrismaService,

    private audit: AuditService,

    private auth: AuthService,

    private installments: InstallmentSchedulerService,

  ) {}

  private async allocateLoanCode(tenantId: string, db: any = this.prisma): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generateLoanCode();
      const exists = await db.loan.findFirst({
        where: { tenantId, code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    return `${generateLoanCode()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
  }

  /** Asigna código visible a créditos que aún no lo tengan (vacío o placeholder). */
  async ensureLoanCodes(tenantId: string) {
    const loans = await this.prisma.loan.findMany({
      where: { tenantId },
      select: { id: true, code: true },
    });
    for (const loan of loans) {
      const current = (loan.code || '').trim();
      if (current) continue;
      const code = await this.allocateLoanCode(tenantId);
      await this.prisma.loan.update({ where: { id: loan.id }, data: { code } });
    }
  }



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
    select: {
      installmentNumber: true,
      dueDate: true,
      expectedInterest: true,
      paidInterest: true,
      status: true,
    },
  };

  async findAll(tenantId: string) {
    await this.ensureLoanCodes(tenantId);

    const activeIds = await this.prisma.loan.findMany({
      where: { tenantId, status: 'active', currentBalance: { gt: 0 } },
      select: { id: true },
    });
    for (const loan of activeIds) {
      await this.installments.ensureAccruedInstallments(loan.id, new Date());
    }

    const loans = await this.prisma.loan.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: { select: { id: true, firstName: true, lastName: true, documentNum: true } },
        product: { select: { id: true, name: true } },
        installments: this.openInstallmentInclude,
      },
    });

    return loans.map((loan) => ({
      ...loan,
      pendingInterest: loan.installments.reduce(
        (sum, item) => sum + Math.max(0, item.expectedInterest - item.paidInterest),
        0,
      ),
    }));
  }



  async findOne(tenantId: string, id: string) {
    await this.installments.ensureAccruedInstallments(id, new Date());

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

    const pendingInterest = loan.installments
      .filter((item) => ['pending', 'partial', 'overdue'].includes(item.status))
      .reduce((sum, item) => sum + Math.max(0, item.expectedInterest - item.paidInterest), 0);

    const changeLogs = await this.audit.findByEntity(tenantId, 'loan', id, 100);
    const changeHistory = changeLogs
      .filter((log) => log.action === 'update')
      .map((log) => {
        const oldValues = (log.oldValues ?? {}) as Record<string, unknown>;
        const newValues = (log.newValues ?? {}) as Record<string, unknown>;
        const keys = Array.from(
          new Set([...Object.keys(oldValues), ...Object.keys(newValues)]),
        ).filter((key) => key !== 'confirmPassword');

        const changes = keys
          .filter((key) => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]))
          .map((key) => ({
            field: key,
            previousValue: oldValues[key] ?? null,
            newValue: newValues[key] ?? null,
          }));

        return {
          id: log.id,
          action: log.action,
          createdAt: log.createdAt,
          user: log.user
            ? {
                name: `${log.user.firstName} ${log.user.lastName}`.trim(),
                email: log.user.email,
              }
            : null,
          changes,
        };
      })
      .filter((entry) => entry.changes.length > 0);

    return { ...loan, pendingInterest, changeHistory };
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
    const startDate = parseDateOnly(dto.startDate);

    const loan = await this.prisma.$transaction(async (tx) => {
      const code = await this.allocateLoanCode(tenantId, tx);
      const newLoan = await tx.loan.create({
        data: {
          tenantId,
          borrowerId: dto.borrowerId,
          productId: product.id,
          code,
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

    // Si el desembolso es anterior a hoy, abre todos los ciclos que ya aplican
    // y genera alertas de interés por cobrar / atraso.
    await this.installments.ensureAccruedInstallmentsAndAlerts(loan.id, new Date());



    await this.audit.log({

      tenantId,

      userId,

      entityType: 'loan',

      entityId: loan.id,

      action: 'create',

      newValues: { ...(dto as any), code: loan.code },

      ipAddress: ip,

    });



    return this.findOne(tenantId, loan.id);

  }

  async update(tenantId: string, id: string, dto: UpdateLoanDto, userId: string, ip?: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, tenantId },
      include: {
        term: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');
    if (loan.status !== 'active') {
      throw new BadRequestException('Solo se pueden modificar créditos activos.');
    }

    await this.auth.verifyPassword(userId, dto.confirmPassword);

    const nextRate = dto.interestRate ?? Number(loan.interestRate);
    const nextFrequency = dto.paymentFrequency ?? loan.paymentFrequency;
    const nextStart = dto.startDate ? parseDateOnly(dto.startDate) : parseDateOnly(loan.startDate);
    const nextPrincipal = dto.principalAmount ?? loan.principalAmount;
    const principalDelta = nextPrincipal - loan.principalAmount;
    const nextBalance = loan.currentBalance + principalDelta;

    if (nextBalance < 0) {
      throw new BadRequestException(
        'El nuevo valor prestado dejaría Por cobrar en negativo. Revisa abonos a capital o el monto.',
      );
    }

    const rateChanged = dto.interestRate != null && Number(dto.interestRate) !== Number(loan.interestRate);
    const frequencyChanged = dto.paymentFrequency != null && dto.paymentFrequency !== loan.paymentFrequency;
    const startChanged =
      dto.startDate != null &&
      parseDateOnly(dto.startDate).getTime() !== parseDateOnly(loan.startDate).getTime();
    const principalChanged = dto.principalAmount != null && dto.principalAmount !== loan.principalAmount;

    if (!rateChanged && !frequencyChanged && !startChanged && !principalChanged) {
      throw new BadRequestException('No hay cambios para guardar.');
    }

    const oldValues = {
      principalAmount: loan.principalAmount,
      currentBalance: loan.currentBalance,
      interestRate: Number(loan.interestRate),
      paymentFrequency: loan.paymentFrequency,
      startDate: parseDateOnly(loan.startDate).toISOString().slice(0, 10),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.loan.update({
        where: { id: loan.id },
        data: {
          principalAmount: nextPrincipal,
          currentBalance: nextBalance,
          interestRate: nextRate,
          paymentFrequency: nextFrequency,
          startDate: nextStart,
        },
      });

      if (loan.term) {
        await tx.loanTerm.update({
          where: { id: loan.term.id },
          data: {
            principalAmount: nextPrincipal,
            interestRate: nextRate,
            paymentFrequency: nextFrequency,
          },
        });
      }

      if (principalChanged && principalDelta !== 0) {
        await tx.loanBalanceEvent.create({
          data: {
            loanId: loan.id,
            eventType: principalDelta > 0 ? 'principal_increase' : 'principal_decrease',
            amount: Math.abs(principalDelta),
            balanceAfter: nextBalance,
            description:
              principalDelta > 0
                ? `Ajuste de prestado (+${principalDelta.toLocaleString('es-CO')})`
                : `Ajuste de prestado (${principalDelta.toLocaleString('es-CO')})`,
          },
        });
      }

      if (rateChanged || principalChanged) {
        const open = await tx.loanInstallment.findMany({
          where: {
            loanId: loan.id,
            status: { in: ['pending', 'partial', 'overdue'] },
          },
        });
        for (const installment of open) {
          const newExpected = calculatePeriodInterest(nextBalance, nextRate, nextFrequency);
          await tx.loanInstallment.update({
            where: { id: installment.id },
            data: { expectedInterest: Math.max(newExpected, installment.paidInterest) },
          });
        }
      }
    });

    await this.installments.ensureAccruedInstallmentsAndAlerts(loan.id, new Date());

    await this.audit.log({
      tenantId,
      userId,
      entityType: 'loan',
      entityId: loan.id,
      action: 'update',
      oldValues,
      newValues: {
        principalAmount: nextPrincipal,
        currentBalance: nextBalance,
        interestRate: nextRate,
        paymentFrequency: nextFrequency,
        startDate: nextStart.toISOString().slice(0, 10),
      },
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
        },
      },
    }).then((loans) =>
      loans.map((loan) => ({
        ...loan,
        pendingInterest: loan.installments.reduce(
          (sum, item) => sum + Math.max(0, item.expectedInterest - item.paidInterest),
          0,
        ),
      })),
    );
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
      loanCode: loan.code || loan.id.slice(0, 8).toUpperCase(),
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

