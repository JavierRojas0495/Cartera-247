import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentFrequency } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { calculatePeriodInterest } from '../../common/utils/money.util';
import {
  addPaymentPeriods,
  daysOverdue,
  expectedInstallmentCount,
  graceDaysFromRules,
  parseDateOnly,
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
      await this.ensureAccruedInstallments(loan.id, new Date());
    }
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
