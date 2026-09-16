import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { InstallmentSchedulerService } from '../loans/installment-scheduler.service';
import { calculateLateFee } from '../../common/utils/money.util';

@Injectable()
export class OverdueService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private installments: InstallmentSchedulerService,
  ) {}

  findAll(tenantId: string) {
    return this.prisma.overdueEvent.findMany({
      where: {
        installment: { loan: { tenantId } },
      },
      include: {
        installment: {
          include: {
            loan: {
              select: {
                id: true,
                code: true,
                borrower: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        decision: true,
      },
      orderBy: { detectedAt: 'desc' },
    });
  }

  /** Refresca alertas (1 por crédito en mora) y lista solo esas. */
  async getAlerts(tenantId: string) {
    const activeLoans = await this.prisma.loan.findMany({
      where: { tenantId, status: 'active', currentBalance: { gt: 0 } },
      select: { id: true },
    });

    for (const loan of activeLoans) {
      await this.installments.ensureAccruedInstallmentsAndAlerts(loan.id, new Date());
    }

    // Descarta alertas sueltas por ciclo u otros tipos viejos.
    await this.prisma.alert.updateMany({
      where: {
        tenantId,
        isRead: false,
        OR: [
          { type: { not: 'overdue' } },
          { entityType: { not: 'loan' } },
        ],
      },
      data: { isRead: true },
    });

    return this.prisma.alert.findMany({
      where: {
        tenantId,
        isRead: false,
        type: 'overdue',
        entityType: 'loan',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async detectOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInstallments = await this.prisma.loanInstallment.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: ['pending', 'partial'] },
        loan: { status: 'active' },
      },
      include: {
        loan: {
          include: {
            product: { include: { lateRules: true } },
          },
        },
      },
    });

    const touchedLoanIds = new Set<string>();

    for (const installment of overdueInstallments) {
      const existing = await this.prisma.overdueEvent.findFirst({
        where: { installmentId: installment.id, status: 'pending_review' },
      });
      if (existing) continue;

      const daysOverdue = Math.floor(
        (today.getTime() - installment.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const lateRule = installment.loan.product.lateRules[0];
      const graceDays = lateRule?.graceDays ?? 0;
      if (daysOverdue <= graceDays) continue;

      const effectiveDays = daysOverdue - graceDays;
      const calculatedFee = calculateLateFee(
        installment.expectedInterest - installment.paidInterest,
        Number(lateRule?.dailyRate ?? 0),
        effectiveDays,
        lateRule?.fixedPenalty ?? 0,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.loanInstallment.update({
          where: { id: installment.id },
          data: { status: 'overdue' },
        });

        await tx.overdueEvent.create({
          data: {
            installmentId: installment.id,
            daysOverdue: effectiveDays,
            calculatedFee,
            status: 'pending_review',
          },
        });
      });

      touchedLoanIds.add(installment.loanId);
    }

    for (const loanId of touchedLoanIds) {
      await this.installments.syncCollectionAlerts(loanId, today);
    }
  }

  async approve(eventId: string, userId: string, tenantId: string, ip?: string) {
    const event = await this.prisma.overdueEvent.findFirst({
      where: {
        id: eventId,
        installment: { loan: { tenantId } },
      },
    });
    if (!event) throw new NotFoundException('Evento de mora no encontrado');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.overdueEvent.update({
        where: { id: eventId },
        data: { status: 'approved' },
      });

      await tx.lateFeeDecision.create({
        data: {
          overdueEventId: eventId,
          decidedById: userId,
          decision: 'approved',
        },
      });

      return result;
    });

    await this.audit.log({
      tenantId,
      userId,
      entityType: 'overdue_event',
      entityId: eventId,
      action: 'approve',
      newValues: { status: 'approved', fee: event.calculatedFee },
      ipAddress: ip,
    });

    return updated;
  }

  async waive(
    eventId: string,
    userId: string,
    tenantId: string,
    reason: string,
    ip?: string,
  ) {
    const event = await this.prisma.overdueEvent.findFirst({
      where: {
        id: eventId,
        installment: { loan: { tenantId } },
      },
    });
    if (!event) throw new NotFoundException('Evento de mora no encontrado');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.overdueEvent.update({
        where: { id: eventId },
        data: { status: 'waived' },
      });

      await tx.lateFeeDecision.create({
        data: {
          overdueEventId: eventId,
          decidedById: userId,
          decision: 'waived',
          reason,
        },
      });

      return result;
    });

    await this.audit.log({
      tenantId,
      userId,
      entityType: 'overdue_event',
      entityId: eventId,
      action: 'waive',
      newValues: { status: 'waived', reason },
      ipAddress: ip,
    });

    return updated;
  }
}
