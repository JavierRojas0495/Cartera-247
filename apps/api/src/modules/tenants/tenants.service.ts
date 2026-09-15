import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  ActivateModuleDto,
  SupportSessionDto,
} from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        modules: { where: { isActive: true }, include: { module: true } },
        _count: { select: { borrowers: true, loans: true } },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        modules: { include: { module: true } },
        memberships: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } },
        },
      },
    });
  }

  async create(dto: CreateTenantDto, adminUserId: string, ip?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail },
    });
    if (existing) {
      throw new ConflictException('El email del dueño ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);

    const tenant = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: dto.name,
          legalName: dto.legalName,
          nit: dto.nit,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
        },
      });

      const owner = await tx.user.create({
        data: {
          email: dto.ownerEmail,
          passwordHash,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
        },
      });

      await tx.tenantMembership.create({
        data: { userId: owner.id, tenantId: newTenant.id, role: 'owner' },
      });

      const coreModules = await tx.module.findMany({ where: { isCore: true } });
      for (const mod of coreModules) {
        await tx.tenantModule.create({
          data: { tenantId: newTenant.id, moduleId: mod.id, activatedBy: adminUserId },
        });
      }

      return newTenant;
    });

    await this.audit.log({
      userId: adminUserId,
      entityType: 'tenant',
      entityId: tenant.id,
      action: 'create',
      newValues: { name: tenant.name, email: tenant.email },
      ipAddress: ip,
    });

    return this.findOne(tenant.id);
  }

  async update(id: string, dto: UpdateTenantDto, userId: string, ip?: string) {
    const before = await this.prisma.tenant.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Tenant no encontrado');

    const tenant = await this.prisma.tenant.update({ where: { id }, data: dto });

    await this.audit.log({
      tenantId: id,
      userId,
      entityType: 'tenant',
      entityId: id,
      action: 'update',
      oldValues: before as any,
      newValues: dto as any,
      ipAddress: ip,
    });

    return tenant;
  }

  async activateModule(
    tenantId: string,
    dto: ActivateModuleDto,
    adminUserId: string,
    ip?: string,
  ) {
    const mod = await this.prisma.module.findUnique({ where: { code: dto.moduleCode } });
    if (!mod) throw new NotFoundException('Módulo no encontrado');

    const result = await this.prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId: mod.id } },
      create: {
        tenantId,
        moduleId: mod.id,
        isActive: true,
        settings: (dto.settings as any) || {},
        activatedBy: adminUserId,
      },
      update: { isActive: true, settings: (dto.settings as any) || {} },
      include: { module: true },
    });

    await this.audit.log({
      tenantId,
      userId: adminUserId,
      entityType: 'tenant_module',
      entityId: result.id,
      action: 'update',
      newValues: { moduleCode: dto.moduleCode, isActive: true },
      ipAddress: ip,
    });

    return result;
  }

  async deactivateModule(tenantId: string, moduleCode: string, adminUserId: string, ip?: string) {
    const mod = await this.prisma.module.findUnique({ where: { code: moduleCode } });
    if (!mod) throw new NotFoundException('Módulo no encontrado');

    const result = await this.prisma.tenantModule.update({
      where: { tenantId_moduleId: { tenantId, moduleId: mod.id } },
      data: { isActive: false },
      include: { module: true },
    });

    await this.audit.log({
      tenantId,
      userId: adminUserId,
      entityType: 'tenant_module',
      entityId: result.id,
      action: 'update',
      newValues: { moduleCode, isActive: false },
      ipAddress: ip,
    });

    return result;
  }

  async startSupportSession(
    tenantId: string,
    adminUserId: string,
    dto: SupportSessionDto,
    ip?: string,
  ) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { userId: adminUserId },
    });
    if (!admin) throw new NotFoundException('Admin no encontrado');

    const session = await this.prisma.tenantSupportSession.create({
      data: {
        tenantId,
        adminId: admin.id,
        reason: dto.reason,
        ipAddress: ip,
      },
    });

    await this.audit.log({
      tenantId,
      userId: adminUserId,
      entityType: 'support_session',
      entityId: session.id,
      action: 'impersonate',
      newValues: { reason: dto.reason },
      ipAddress: ip,
    });

    return session;
  }
}
