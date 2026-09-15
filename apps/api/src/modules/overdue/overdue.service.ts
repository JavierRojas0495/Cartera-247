import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { calculateLateFee } from '../../common/utils/money.util';

@Injectable()
export class OverdueService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
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

  getAlerts(tenantId: string) {
    return this.prisma.alert.findMany({
      where: { tenantId, isRead: false },
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

        await tx.alert.create({
          data: {
            tenantId: installment.loan.tenantId,
            type: 'overdue',
            title: 'Cuota vencida',
            message: `Cuota #${installment.installmentNumber} vencida hace ${effectiveDays} días`,
            entityType: 'loan_installment',
            entityId: installment.id,
          },
        });
      });
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
