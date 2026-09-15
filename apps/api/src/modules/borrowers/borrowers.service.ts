import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateBorrowerDto,
  UpdateBorrowerDto,
  CreateFieldDefinitionDto,
  PersonalReferenceDto,
  BorrowerPhoneDto,
  BorrowerWorkPhoneDto,
  BorrowerWorkAddressDto,
} from './dto/borrower.dto';
import {
  getSensitiveFieldChanges,
  SENSITIVE_FIELD_LABELS,
} from './borrower-sensitive.fields';

@Injectable()
export class BorrowersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private auth: AuthService,
  ) {}

  private borrowerInclude = {
    phones: { orderBy: { sortOrder: 'asc' as const } },
    workPhones: { orderBy: { sortOrder: 'asc' as const } },
    workAddresses: { orderBy: { sortOrder: 'asc' as const } },
    personalReferences: { orderBy: { sortOrder: 'asc' as const } },
  };

  findAll(tenantId: string) {
    return this.prisma.borrower.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        ...this.borrowerInclude,
        loans: { where: { status: 'active' }, select: { id: true } },
        _count: { select: { loans: true } },
      },
    });
  }

  findOne(tenantId: string, id: string) {
    return this.prisma.borrower.findFirst({
      where: { id, tenantId },
      include: {
        ...this.borrowerInclude,
        fieldValues: { include: { definition: true } },
        loans: {
          where: { status: 'active' },
          select: {
            id: true,
            currentBalance: true,
            status: true,
            interestRate: true,
            product: { select: { name: true } },
            installments: {
              where: { status: { in: ['pending', 'partial', 'overdue'] } },
              orderBy: { dueDate: 'asc' },
              take: 1,
              select: { expectedInterest: true, paidInterest: true, dueDate: true },
            },
          },
        },
      },
    });
  }

  async create(tenantId: string, dto: CreateBorrowerDto, userId: string, ip?: string) {
    const primaryPhone = this.resolvePrimaryPhone(dto.phones, dto.phone);
    const primaryWorkPhone = this.resolvePrimaryWorkPhone(dto.workPhones, dto.workPhone);
    const primaryWorkAddress = this.resolvePrimaryWorkAddress(dto.workAddresses, dto.workAddress);

    const borrower = await this.prisma.$transaction(async (tx) => {
      const created = await tx.borrower.create({
        data: {
          tenantId,
          documentType: dto.documentType || 'CC',
          documentNum: dto.documentNum,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: primaryPhone,
          address: dto.residenceAddress,
          residenceAddress: dto.residenceAddress,
          city: dto.city,
          neighborhood: dto.neighborhood,
          workCompanyName: dto.workCompanyName?.trim() || undefined,
          workContactName: dto.workContactName?.trim() || undefined,
          workAddress: primaryWorkAddress,
          workPhone: primaryWorkPhone,
          customData: (dto.customData as any) || {},
        },
      });

      await this.savePhones(tx, created.id, dto.phones, dto.phone);
      await this.saveWorkPhones(tx, created.id, dto.workPhones, dto.workPhone);
      await this.saveWorkAddresses(tx, created.id, dto.workAddresses, dto.workAddress);
      await this.saveReferences(tx, created.id, dto.personalReferences);
      return created;
    });

    await this.audit.log({
      tenantId,
      userId,
      entityType: 'borrower',
      entityId: borrower.id,
      action: 'create',
      newValues: dto as any,
      ipAddress: ip,
    });

    return this.findOne(tenantId, borrower.id);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateBorrowerDto,
    userId: string,
    ip?: string,
  ) {
    const before = await this.prisma.borrower.findFirst({
      where: { id, tenantId },
      include: { loans: { where: { status: 'active' }, select: { id: true } } },
    });
    if (!before) throw new NotFoundException('Prestatario no encontrado');

    const hasActiveLoans = before.loans.length > 0;
    const sensitiveChanges = getSensitiveFieldChanges(before, dto);

    if (hasActiveLoans && sensitiveChanges.length > 0) {
      if (!dto.confirmPassword) {
        throw new BadRequestException(
          `Este prestatario tiene préstamos activos. Debes confirmar tu contraseña para modificar: ${sensitiveChanges.map((f) => SENSITIVE_FIELD_LABELS[f]).join(', ')}.`,
        );
      }
      await this.auth.verifyPassword(userId, dto.confirmPassword);
    }

    const deactivating =
      dto.status === 'inactive' &&
      before.status !== 'inactive';

    if (deactivating && hasActiveLoans) {
      throw new BadRequestException(
        'No se puede desactivar el prestatario mientras tenga préstamos activos. Todos los préstamos deben estar pagados.',
      );
    }

    const { confirmPassword: _confirmPassword, ...auditDto } = dto;
    const primaryPhone =
      dto.phones !== undefined || dto.phone !== undefined
        ? this.resolvePrimaryPhone(dto.phones, dto.phone)
        : undefined;
    const primaryWorkPhone =
      dto.workPhones !== undefined || dto.workPhone !== undefined
        ? this.resolvePrimaryWorkPhone(dto.workPhones, dto.workPhone)
        : undefined;
    const primaryWorkAddress =
      dto.workAddresses !== undefined || dto.workAddress !== undefined
        ? this.resolvePrimaryWorkAddress(dto.workAddresses, dto.workAddress)
        : undefined;

    const borrower = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.borrower.update({
        where: { id },
        data: {
          documentNum: dto.documentNum,
          documentType: dto.documentType,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: primaryPhone,
          residenceAddress: dto.residenceAddress,
          address: dto.residenceAddress ?? undefined,
          city: dto.city,
          neighborhood: dto.neighborhood,
          workCompanyName: dto.workCompanyName?.trim() || undefined,
          workContactName: dto.workContactName?.trim() || undefined,
          workPhone: primaryWorkPhone,
          workAddress: primaryWorkAddress,
          status: dto.status,
          customData: dto.customData ? (dto.customData as any) : undefined,
        },
      });

      if (dto.phones !== undefined || dto.phone !== undefined) {
        await tx.borrowerPhone.deleteMany({ where: { borrowerId: id } });
        await this.savePhones(tx, id, dto.phones, dto.phone);
      }

      if (dto.workPhones !== undefined || dto.workPhone !== undefined) {
        await tx.borrowerWorkPhone.deleteMany({ where: { borrowerId: id } });
        await this.saveWorkPhones(tx, id, dto.workPhones, dto.workPhone);
      }

      if (dto.workAddresses !== undefined || dto.workAddress !== undefined) {
        await tx.borrowerWorkAddress.deleteMany({ where: { borrowerId: id } });
        await this.saveWorkAddresses(tx, id, dto.workAddresses, dto.workAddress);
      }

      if (dto.personalReferences) {
        await tx.borrowerReference.deleteMany({ where: { borrowerId: id } });
        await this.saveReferences(tx, id, dto.personalReferences);
      }

      return updated;
    });

    await this.audit.log({
      tenantId,
      userId,
      entityType: 'borrower',
      entityId: id,
      action: 'update',
      oldValues: before as any,
      newValues: auditDto as any,
      ipAddress: ip,
    });

    return this.findOne(tenantId, borrower.id);
  }

  private resolvePrimaryPhone(phones?: BorrowerPhoneDto[], legacyPhone?: string): string | undefined {
    const valid = (phones ?? []).filter((p) => p.phone?.trim());
    if (valid.length > 0) return valid[0].phone.trim();
    return legacyPhone?.trim() || undefined;
  }

  private resolvePrimaryWorkPhone(phones?: BorrowerWorkPhoneDto[], legacy?: string): string | undefined {
    const valid = (phones ?? []).filter((p) => p.phone?.trim());
    if (valid.length > 0) return valid[0].phone.trim();
    return legacy?.trim() || undefined;
  }

  private resolvePrimaryWorkAddress(addresses?: BorrowerWorkAddressDto[], legacy?: string): string | undefined {
    const valid = (addresses ?? []).filter((a) => a.address?.trim());
    if (valid.length > 0) return valid[0].address.trim();
    return legacy?.trim() || undefined;
  }

  private async savePhones(
    tx: Pick<PrismaService, 'borrowerPhone'>,
    borrowerId: string,
    phones?: BorrowerPhoneDto[],
    legacyPhone?: string,
  ) {
    const list = this.normalizePhones(phones, legacyPhone);
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      await tx.borrowerPhone.create({
        data: {
          borrowerId,
          phone: entry.phone.trim(),
          label: entry.label?.trim() || 'Personal',
          isPrimary: i === 0,
          sortOrder: i,
        },
      });
    }
  }

  private normalizePhones(phones?: BorrowerPhoneDto[], legacyPhone?: string): BorrowerPhoneDto[] {
    const valid = (phones ?? []).filter((p) => p.phone?.trim());
    if (valid.length > 0) return valid;
    if (legacyPhone?.trim()) return [{ phone: legacyPhone.trim(), label: 'Personal' }];
    return [];
  }

  private async saveWorkPhones(
    tx: Pick<PrismaService, 'borrowerWorkPhone'>,
    borrowerId: string,
    phones?: BorrowerWorkPhoneDto[],
    legacy?: string,
  ) {
    const list = this.normalizeWorkPhones(phones, legacy);
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      await tx.borrowerWorkPhone.create({
        data: {
          borrowerId,
          phone: entry.phone.trim(),
          label: entry.label?.trim() || 'Oficina',
          isPrimary: i === 0,
          sortOrder: i,
        },
      });
    }
  }

  private normalizeWorkPhones(phones?: BorrowerWorkPhoneDto[], legacy?: string): BorrowerWorkPhoneDto[] {
    const valid = (phones ?? []).filter((p) => p.phone?.trim());
    if (valid.length > 0) return valid;
    if (legacy?.trim()) return [{ phone: legacy.trim(), label: 'Oficina' }];
    return [];
  }

  private async saveWorkAddresses(
    tx: Pick<PrismaService, 'borrowerWorkAddress'>,
    borrowerId: string,
    addresses?: BorrowerWorkAddressDto[],
    legacy?: string,
  ) {
    const list = this.normalizeWorkAddresses(addresses, legacy);
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      await tx.borrowerWorkAddress.create({
        data: {
          borrowerId,
          address: entry.address.trim(),
          label: entry.label?.trim() || 'Sede principal',
          isPrimary: i === 0,
          sortOrder: i,
        },
      });
    }
  }

  private normalizeWorkAddresses(
    addresses?: BorrowerWorkAddressDto[],
    legacy?: string,
  ): BorrowerWorkAddressDto[] {
    const valid = (addresses ?? []).filter((a) => a.address?.trim());
    if (valid.length > 0) return valid;
    if (legacy?.trim()) return [{ address: legacy.trim(), label: 'Sede principal' }];
    return [];
  }

  private async saveReferences(
    tx: Pick<PrismaService, 'borrowerReference'>,
    borrowerId: string,
    references: PersonalReferenceDto[],
  ) {
    for (let i = 0; i < references.length; i++) {
      const ref = references[i];
      if (!ref.fullName?.trim() || !ref.phone?.trim()) continue;
      await tx.borrowerReference.create({
        data: {
          borrowerId,
          fullName: ref.fullName.trim(),
          phone: ref.phone.trim(),
          relationship: ref.relationship.trim(),
          address: ref.address?.trim() || undefined,
          sortOrder: i,
        },
      });
    }
  }

  getFieldDefinitions(tenantId: string) {
    return this.prisma.borrowerFieldDefinition.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  createFieldDefinition(tenantId: string, dto: CreateFieldDefinitionDto) {
    return this.prisma.borrowerFieldDefinition.create({
      data: {
        tenantId,
        name: dto.name,
        label: dto.label,
        fieldType: dto.fieldType,
        required: dto.required || false,
        options: dto.options || [],
      },
    });
  }

  assertTenantAccess(userTenantId: string | undefined, tenantId: string) {
    if (!userTenantId || userTenantId !== tenantId) {
      throw new ForbiddenException('Acceso denegado al tenant');
    }
  }
}
