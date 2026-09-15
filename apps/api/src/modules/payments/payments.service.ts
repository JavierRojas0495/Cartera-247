import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { InstallmentSchedulerService } from '../loans/installment-scheduler.service';
import { LoansService } from '../loans/loans.service';
import { PaymentAllocationService } from './payment-allocation.service';
import { CreatePaymentDto } from './dto/payment.dto';
import {
  chargeableLateDays,
  daysOverdue,
  expectedInstallmentCount,
  graceDaysFromRules,
  parseDateOnly,
} from '../../common/utils/loan-cycle.util';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private allocation: PaymentAllocationService,
    private audit: AuditService,
    private installments: InstallmentSchedulerService,
    private loansService: LoansService,
  ) {}

  findAll(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { paymentDate: 'desc' },
      include: {
        loan: {
          select: {
            id: true,
            borrower: { select: { firstName: true, lastName: true } },
          },
        },
        allocations: true,
      },
    });
  }

  findByLoan(tenantId: string, loanId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId, loanId, status: 'accepted' },
      orderBy: { paymentDate: 'desc' },
      include: { allocations: true },
    });
  }

  findBorrowerPayments(tenantId: string, borrowerId: string) {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        status: 'accepted',
        loan: { borrowerId },
      },
      orderBy: { paymentDate: 'desc' },
      include: {
        loan: { select: { id: true } },
        allocations: true,
      },
    });
  }

  async create(tenantId: string, dto: CreatePaymentDto, userId: string, ip?: string) {
    const paymentDate = parseDateOnly(dto.paymentDate);

    const existing = await this.prisma.loan.findFirst({
      where: { id: dto.loanId, tenantId },
    });
    if (!existing) throw new NotFoundException('Préstamo no encontrado');
    if (existing.status !== 'active') {
      throw new BadRequestException('El préstamo no está activo');
    }

    await this.installments.ensureAccruedInstallments(dto.loanId, paymentDate);

    const loan = await this.prisma.loan.findFirst({
      where: { id: dto.loanId, tenantId },
      include: {
        term: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');

    const needed = expectedInstallmentCount(
      parseDateOnly(loan.startDate),
      paymentDate,
      loan.paymentFrequency,
    );
    const graceDays = graceDaysFromRules(loan.term?.lateFeeRules);
    const dueCycles = loan.installments.filter((item) => item.installmentNumber <= needed);
    const unpaidCycles = dueCycles.filter((item) => item.expectedInterest - item.paidInterest > 0);

    const accruedInterest = unpaidCycles.reduce(
      (sum, item) => sum + Math.max(0, item.expectedInterest - item.paidInterest),
      0,
    );

    const oldestUnpaid = unpaidCycles[0] ?? dueCycles[dueCycles.length - 1];
    const lateDays = oldestUnpaid
      ? daysOverdue(parseDateOnly(oldestUnpaid.dueDate), paymentDate, graceDays)
      : 0;
    const settledThrough = await this.loansService.lastMoraSettledThrough(loan.id);
    const newLateDays = oldestUnpaid
      ? chargeableLateDays(
          parseDateOnly(oldestUnpaid.dueDate),
          paymentDate,
          graceDays,
          settledThrough,
        )
      : 0;
    const isOverdue = accruedInterest > 0 && lateDays > 0;
    const canChargeLateFee = isOverdue && newLateDays > 0;

    if (dto.chargeLateFee && !canChargeLateFee) {
      throw new BadRequestException(
        isOverdue
          ? 'La mora de esos días ya fue cobrada. No se vuelve a cobrar aunque aún falte interés.'
          : 'Este crédito no está en mora en la fecha del pago.',
      );
    }
    if (dto.chargeLateFee && (!dto.lateFeeAmount || dto.lateFeeAmount <= 0)) {
      throw new BadRequestException('Indica el valor de la mora a cobrar.');
    }

    const lateFeeToApply = dto.chargeLateFee && canChargeLateFee ? dto.lateFeeAmount ?? 0 : 0;

    const allocationResult = this.allocation.allocate({
      paymentAmount: dto.amount,
      accruedInterest: Math.max(0, accruedInterest),
      approvedLateFee: lateFeeToApply,
      principalBalance: loan.currentBalance,
    });

    const payment = await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          tenantId,
          loanId: dto.loanId,
          amount: dto.amount,
          paymentDate,
          method: dto.method,
          notes: dto.notes,
          recordedById: userId,
          status: 'accepted',
        },
      });

      let remainingInterest = allocationResult.toInterest;
      let remainingPrincipal = allocationResult.toPrincipal;
      let remainingLateFee = allocationResult.toLateFee;
      const targets = unpaidCycles.length > 0 ? unpaidCycles : [];

      if (targets.length === 0 && (remainingInterest > 0 || remainingPrincipal > 0 || remainingLateFee > 0)) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: newPayment.id,
            installmentId: oldestUnpaid?.id,
            toInterest: remainingInterest,
            toLateFee: remainingLateFee,
            toPrincipal: remainingPrincipal,
          },
        });
        if (oldestUnpaid && remainingPrincipal > 0) {
          await tx.loanInstallment.update({
            where: { id: oldestUnpaid.id },
            data: { paidPrincipal: { increment: remainingPrincipal } },
          });
        }
      } else {
        for (let index = 0; index < targets.length; index += 1) {
          const installment = targets[index];
          const interestNeed = Math.max(0, installment.expectedInterest - installment.paidInterest);
          const toInterest = Math.min(remainingInterest, interestNeed);
          remainingInterest -= toInterest;

          const isLast = index === targets.length - 1;
          const toLateFee = isLast ? remainingLateFee : 0;
          const toPrincipal = isLast ? remainingPrincipal : 0;
          if (isLast) {
            remainingLateFee = 0;
            remainingPrincipal = 0;
          }

          if (toInterest === 0 && toLateFee === 0 && toPrincipal === 0) continue;

          await tx.paymentAllocation.create({
            data: {
              paymentId: newPayment.id,
              installmentId: installment.id,
              toInterest,
              toLateFee,
              toPrincipal,
            },
          });

          const paidInterest = installment.paidInterest + toInterest;
          await tx.loanInstallment.update({
            where: { id: installment.id },
            data: {
              paidInterest: { increment: toInterest },
              paidPrincipal: { increment: toPrincipal },
              status: paidInterest >= installment.expectedInterest ? 'paid' : 'partial',
            },
          });
        }

        if (remainingInterest > 0 || remainingPrincipal > 0 || remainingLateFee > 0) {
          await tx.paymentAllocation.create({
            data: {
              paymentId: newPayment.id,
              toInterest: remainingInterest,
              toLateFee: remainingLateFee,
              toPrincipal: remainingPrincipal,
            },
          });
        }
      }

      const newBalance = loan.currentBalance - allocationResult.toPrincipal;
      await tx.loan.update({
        where: { id: loan.id },
        data: {
          currentBalance: newBalance,
          status: newBalance <= 0 ? 'paid_off' : 'active',
        },
      });

      if (allocationResult.toPrincipal > 0) {
        await tx.loanBalanceEvent.create({
          data: {
            loanId: loan.id,
            eventType: 'principal_payment',
            amount: -allocationResult.toPrincipal,
            balanceAfter: newBalance,
            description: `Abono a capital - pago ${newPayment.id}`,
          },
        });
      }

      if (allocationResult.toLateFee > 0 && oldestUnpaid) {
        await tx.overdueEvent.create({
          data: {
            installmentId: oldestUnpaid.id,
            daysOverdue: newLateDays,
            calculatedFee: allocationResult.toLateFee,
            status: 'applied',
          },
        });
      }

      return newPayment;
    });

    await this.audit.log({
      tenantId,
      userId,
      entityType: 'payment',
      entityId: payment.id,
      action: 'create',
      newValues: { ...dto, allocation: allocationResult } as any,
      ipAddress: ip,
    });

    const updatedLoan = await this.prisma.loan.findUnique({ where: { id: dto.loanId } });
    if (updatedLoan?.status === 'active' && updatedLoan.currentBalance > 0) {
      await this.installments.ensureAccruedInstallments(dto.loanId, paymentDate);
    }

    const debtAfter = await this.loansService.getDebtSummary(tenantId, dto.loanId, dto.paymentDate);
    const interestRemaining = Math.max(0, accruedInterest - allocationResult.toInterest);

    const paymentRecord = await this.prisma.payment.findUnique({
      where: { id: payment.id },
      include: { allocations: true },
    });

    return {
      payment: paymentRecord,
      result: {
        paidAmount: dto.amount,
        appliedToInterest: allocationResult.toInterest,
        appliedToLateFee: allocationResult.toLateFee,
        appliedToPrincipal: allocationResult.toPrincipal,
        interestRemaining,
        newPrincipalBalance: updatedLoan?.currentBalance ?? 0,
        totalDebtRemaining: debtAfter.totalDebt,
      },
    };
  }

  async voidPayment(tenantId: string, id: string, userId: string, ip?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: { allocations: true, loan: true },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status === 'voided') {
      throw new BadRequestException('El pago ya está anulado');
    }

    const allocation = payment.allocations[0];
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: { status: 'voided' },
      });

      if (allocation) {
        await tx.loan.update({
          where: { id: payment.loanId },
          data: {
            currentBalance: { increment: allocation.toPrincipal },
            status: 'active',
          },
        });
      }

      return { voided: true };
    });

    await this.audit.log({
      tenantId,
      userId,
      entityType: 'payment',
      entityId: id,
      action: 'void',
      oldValues: payment as any,
      ipAddress: ip,
    });

    return result;
  }
}
