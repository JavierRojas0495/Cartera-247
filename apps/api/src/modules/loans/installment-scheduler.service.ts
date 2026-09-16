import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentFrequency } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { calculatePeriodInterest, roundCop } from '../../common/utils/money.util';
import {
  addPaymentPeriods,
  daysOverdue,
  expectedInstallmentCount,
  graceDaysFromRules,
  parseDateOnly,
  startOfDay,
} from '../../common/utils/loan-cycle.util';

@Injectable()
export class InstallmentSchedulerService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateDueInstallments() {
    const activeLoans = await this.prisma.loan.findMany({
      where: { status: 'active', currentBalance: { gt: 0 } },
      select: { id: true },
    });

    for (const loan of activeLoans) {
      await this.ensureAccruedInstallmentsAndAlerts(loan.id, new Date());
    }
  }

  /**
   * Crea ciclos hasta la fecha y genera alertas de cobro si ya hay interés vencido/por cobrar.
   * Útil al crear un crédito con desembolso retroactivo.
   */
  async ensureAccruedInstallmentsAndAlerts(loanId: string, asOf: Date = new Date()) {
    await this.ensureAccruedInstallments(loanId, asOf);
    await this.syncCollectionAlerts(loanId, asOf);
  }

  /**
   * Crea solo los ciclos de interés que ya aplican a la fecha.
   * No abre el periodo siguiente solo porque el interés actual ya se pagó.
   */
  async ensureAccruedInstallments(loanId: string, asOf: Date = new Date()) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        installments: { orderBy: { installmentNumber: 'asc' } },
        term: true,
      },
    });

    if (!loan || loan.status !== 'active' || loan.currentBalance <= 0) return null;

    const asOfDate = parseDateOnly(asOf);
    const needed = expectedInstallmentCount(
      parseDateOnly(loan.startDate),
      asOfDate,
      loan.paymentFrequency,
    );
    const existingNumbers = new Set(loan.installments.map((item) => item.installmentNumber));
    const graceDays = graceDaysFromRules(loan.term?.lateFeeRules);

    for (let number = 1; number <= needed; number += 1) {
      if (existingNumbers.has(number)) continue;
      const dueDate = addPaymentPeriods(
        parseDateOnly(loan.startDate),
        loan.paymentFrequency,
        number,
      );
      await this.prisma.loanInstallment.create({
        data: {
          loanId,
          installmentNumber: number,
          dueDate,
          expectedInterest: calculatePeriodInterest(
            loan.currentBalance,
            Number(loan.interestRate),
            loan.paymentFrequency,
          ),
          expectedPrincipal: 0,
        },
      });
    }

    const current = await this.prisma.loanInstallment.findMany({
      where: { loanId },
    });

    for (const installment of current) {
      if (installment.installmentNumber > needed) continue;
      const remaining = installment.expectedInterest - installment.paidInterest;
      if (remaining <= 0) continue;
      const lateDays = daysOverdue(parseDateOnly(installment.dueDate), asOfDate, graceDays);
      if (lateDays > 0 && installment.status !== 'overdue' && installment.status !== 'paid') {
        await this.prisma.loanInstallment.update({
          where: { id: installment.id },
          data: { status: 'overdue' },
        });
      }
    }

    return needed;
  }

  /**
   * Una sola alerta por crédito en mora (corte ya vencido).
   * No alerta el día de corte sin atraso; no duplica por ciclo interno.
   */
  async syncCollectionAlerts(loanId: string, asOf: Date = new Date()) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        borrower: { select: { firstName: true, lastName: true } },
        installments: {
          where: { status: { in: ['pending', 'partial', 'overdue'] } },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!loan || loan.status !== 'active') return;

    const asOfDay = startOfDay(parseDateOnly(asOf));
    const borrowerName = `${loan.borrower.firstName} ${loan.borrower.lastName}`.trim();
    const loanCode = loan.code || loan.id.slice(0, 8).toUpperCase();
    const installmentIds = loan.installments.map((item) => item.id);

    let pendingInterest = 0;
    let maxDaysLate = 0;
    let oldestDue: Date | null = null;

    for (const installment of loan.installments) {
      const remaining = roundCop(installment.expectedInterest - installment.paidInterest);
      if (remaining <= 0) continue;

      const due = startOfDay(parseDateOnly(installment.dueDate));
      const calendarLate = daysOverdue(due, asOfDay, 0);
      if (calendarLate <= 0) continue;

      pendingInterest += remaining;
      if (calendarLate > maxDaysLate) maxDaysLate = calendarLate;
      if (!oldestDue || due.getTime() < oldestDue.getTime()) oldestDue = due;
    }

    // Limpia alertas viejas por ciclo (evita repeticiones en el dashboard).
    if (installmentIds.length > 0) {
      await this.prisma.alert.updateMany({
        where: {
          tenantId: loan.tenantId,
          isRead: false,
          entityType: 'loan_installment',
          entityId: { in: installmentIds },
        },
        data: { isRead: true },
      });
    }

    const existingLoanAlert = await this.prisma.alert.findFirst({
      where: {
        tenantId: loan.tenantId,
        entityType: 'loan',
        entityId: loan.id,
        type: 'overdue',
        isRead: false,
      },
    });

    if (maxDaysLate <= 0 || pendingInterest <= 0) {
      if (existingLoanAlert) {
        await this.prisma.alert.update({
          where: { id: existingLoanAlert.id },
          data: { isRead: true },
        });
      }
      return;
    }

    const amountLabel = `$${pendingInterest.toLocaleString('es-CO')}`;
    const daysLabel = `${maxDaysLate} día${maxDaysLate === 1 ? '' : 's'} de mora`;
    const dueLabel = oldestDue ? oldestDue.toLocaleDateString('es-CO') : '';
    const title = 'Crédito en mora';
    const message = `${loanCode} · ${borrowerName}: ${amountLabel} de interés pendiente · ${daysLabel}${dueLabel ? ` · corte desde ${dueLabel}` : ''}.`;

    if (existingLoanAlert) {
      await this.prisma.alert.update({
        where: { id: existingLoanAlert.id },
        data: { title, message },
      });
      return;
    }

    await this.prisma.alert.create({
      data: {
        tenantId: loan.tenantId,
        type: 'overdue',
        title,
        message,
        entityType: 'loan',
        entityId: loan.id,
      },
    });
  }

  async createFirstInstallment(
    loanId: string,
    startDate: Date,
    balance: number,
    rate: number,
    frequency: PaymentFrequency,
  ) {
    const dueDate = addPaymentPeriods(parseDateOnly(startDate), frequency, 1);
    return this.prisma.loanInstallment.create({
      data: {
        loanId,
        installmentNumber: 1,
        dueDate,
        expectedInterest: calculatePeriodInterest(balance, rate, frequency),
        expectedPrincipal: 0,
      },
    });
  }
}
