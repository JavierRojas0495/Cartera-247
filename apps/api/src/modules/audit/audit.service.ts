import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';

export interface AuditEntry {
  tenantId?: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        oldValues: (entry.oldValues as any) ?? undefined,
        newValues: (entry.newValues as any) ?? undefined,
        ipAddress: entry.ipAddress,
      },
    });
  }

  async findByTenant(tenantId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
  }
}
