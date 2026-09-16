import { PrismaClient, TenantRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Cartera24/7...');

  const modules = [
    { code: 'CORE_CLIENTS', name: 'Clientes', description: 'Gestión de prestatarios', isCore: true },
    { code: 'CORE_LOANS', name: 'Préstamos', description: 'Creación y gestión de préstamos', isCore: true },
    { code: 'CORE_PAYMENTS', name: 'Pagos', description: 'Registro manual de pagos', isCore: true },
    { code: 'REPORTS', name: 'Informes', description: 'Reportes de cartera', isCore: false },
    { code: 'BORROWER_PORTAL', name: 'Portal prestatario', description: 'Acceso prestatario', isCore: false },
    { code: 'COLLECTORS', name: 'Cobradores', description: 'Gestión de cobradores', isCore: false },
    { code: 'NOTIFICATIONS', name: 'Notificaciones', description: 'Push, SMS, email', isCore: false },
  ];

  for (const mod of modules) {
    await prisma.module.upsert({
      where: { code: mod.code },
      create: mod,
      update: mod,
    });
  }

  const permissions = [
    'borrower.create', 'borrower.read', 'borrower.update', 'borrower.delete',
    'loan.create', 'loan.read', 'loan.update',
    'payment.create', 'payment.read', 'payment.void',
    'overdue.approve', 'overdue.waive',
    'report.read', 'tenant.settings',
  ];

  for (const code of permissions) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description: code },
      update: {},
    });
  }

  const roleMap: Record<string, string[]> = {
    owner: permissions,
    admin: permissions.filter((p) => p !== 'borrower.delete'),
    operator: ['borrower.create', 'borrower.read', 'borrower.update', 'loan.create', 'loan.read', 'payment.create', 'payment.read', 'report.read'],
    readonly: ['borrower.read', 'loan.read', 'payment.read', 'report.read'],
  };

  for (const [role, perms] of Object.entries(roleMap)) {
    for (const code of perms) {
      const perm = await prisma.permission.findUnique({ where: { code } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: role as TenantRole, permissionId: perm.id } },
        create: { role: role as TenantRole, permissionId: perm.id },
        update: {},
      });
    }
  }

  const adminHash = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cartera247.com' },
    create: {
      email: 'admin@cartera247.com',
      passwordHash: adminHash,
      firstName: 'Super',
      lastName: 'Admin',
    },
    update: {},
  });

  await prisma.platformAdmin.upsert({
    where: { userId: adminUser.id },
    create: { userId: adminUser.id },
    update: {},
  });

  const demoHash = await bcrypt.hash('Demo123!', 10);
  const ownerUser = await prisma.user.upsert({
    where: { email: 'dueno@demo.com' },
    create: {
      email: 'dueno@demo.com',
      passwordHash: demoHash,
      firstName: 'Carlos',
      lastName: 'Prestamista',
      phone: '3001234567',
    },
    update: {},
  });

  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant-id' },
    create: {
      id: 'demo-tenant-id',
      name: 'Prestamista Demo',
      legalName: 'Prestamista Demo SAS',
      nit: '900123456-1',
      email: 'contacto@demo.com',
      phone: '6011234567',
      address: 'Bogotá, Colombia',
    },
    update: {},
  });

  await prisma.tenantMembership.upsert({
    where: { userId_tenantId: { userId: ownerUser.id, tenantId: tenant.id } },
    create: { userId: ownerUser.id, tenantId: tenant.id, role: 'owner' },
    update: {},
  });

  const allModules = await prisma.module.findMany();
  for (const mod of allModules) {
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: mod.id } },
      create: { tenantId: tenant.id, moduleId: mod.id, isActive: mod.isCore || mod.code === 'REPORTS' || mod.code === 'BORROWER_PORTAL' },
      update: {},
    });
  }

  const product = await prisma.loanProduct.upsert({
    where: { id: 'demo-product-id' },
    create: {
      id: 'demo-product-id',
      tenantId: tenant.id,
      name: 'Crédito Personal Mensual',
      interestMethod: 'interest_first_monthly',
      defaultRate: 0.03,
      paymentFrequency: 'monthly',
    },
    update: {},
  });

  await prisma.loanProductLateFeeRule.upsert({
    where: { id: 'demo-late-rule-id' },
    create: {
      id: 'demo-late-rule-id',
      productId: product.id,
      graceDays: 3,
      dailyRate: 0.001,
      fixedPenalty: 5000,
      requiresApproval: true,
    },
    update: {},
  });

  const borrower = await prisma.borrower.upsert({
    where: { tenantId_documentNum: { tenantId: tenant.id, documentNum: '1234567890' } },
    create: {
      tenantId: tenant.id,
      documentType: 'CC',
      documentNum: '1234567890',
      firstName: 'María',
      lastName: 'García',
      email: 'maria@email.com',
      phone: '3109876543',
      address: 'Calle 123 #45-67, Chapinero',
      residenceAddress: 'Calle 123 #45-67, Chapinero',
      city: 'Bogotá',
      neighborhood: 'Chapinero',
      workCompanyName: 'Comercializadora Andina S.A.S.',
      workContactName: 'Laura Méndez — Jefe inmediato',
      workAddress: 'Carrera 15 #93-47, Bogotá',
      workPhone: '6017654321',
    },
    update: {
      residenceAddress: 'Calle 123 #45-67, Chapinero',
      city: 'Bogotá',
      neighborhood: 'Chapinero',
      workCompanyName: 'Comercializadora Andina S.A.S.',
      workContactName: 'Laura Méndez — Jefe inmediato',
      workAddress: 'Carrera 15 #93-47, Bogotá',
      workPhone: '6017654321',
    },
  });

  await prisma.borrowerWorkPhone.deleteMany({ where: { borrowerId: borrower.id } });
  await prisma.borrowerWorkPhone.createMany({
    data: [
      {
        borrowerId: borrower.id,
        phone: '6017654321',
        label: 'Oficina',
        isPrimary: true,
        sortOrder: 0,
      },
      {
        borrowerId: borrower.id,
        phone: '3204445566',
        label: 'Celular jefe',
        isPrimary: false,
        sortOrder: 1,
      },
    ],
  });

  await prisma.borrowerWorkAddress.deleteMany({ where: { borrowerId: borrower.id } });
  await prisma.borrowerWorkAddress.createMany({
    data: [
      {
        borrowerId: borrower.id,
        address: 'Carrera 15 #93-47, Bogotá',
        label: 'Sede principal',
        isPrimary: true,
        sortOrder: 0,
      },
      {
        borrowerId: borrower.id,
        address: 'Autopista Norte #127-30, Bogotá',
        label: 'Bodega',
        isPrimary: false,
        sortOrder: 1,
      },
    ],
  });

  await prisma.borrowerPhone.deleteMany({ where: { borrowerId: borrower.id } });
  await prisma.borrowerPhone.createMany({
    data: [
      {
        borrowerId: borrower.id,
        phone: '3109876543',
        label: 'Personal',
        isPrimary: true,
        sortOrder: 0,
      },
      {
        borrowerId: borrower.id,
        phone: '3205558899',
        label: 'WhatsApp',
        isPrimary: false,
        sortOrder: 1,
      },
    ],
  });

  await prisma.borrowerReference.deleteMany({ where: { borrowerId: borrower.id } });
  await prisma.borrowerReference.createMany({
    data: [
      {
        borrowerId: borrower.id,
        fullName: 'Carlos García',
        phone: '3201112233',
        relationship: 'Hermano',
        address: 'Calle 80 #11-42, Bogotá',
        sortOrder: 0,
      },
      {
        borrowerId: borrower.id,
        fullName: 'Ana López',
        phone: '3154445566',
        relationship: 'Amiga',
        address: 'Carrera 7 #32-18, Chapinero',
        sortOrder: 1,
      },
    ],
  });

  const borrowerHash = await bcrypt.hash('Demo123!', 10);
  const borrowerUser = await prisma.user.upsert({
    where: { email: 'prestatario@demo.com' },
    create: {
      email: 'prestatario@demo.com',
      passwordHash: borrowerHash,
      firstName: 'María',
      lastName: 'García',
      phone: '3109876543',
    },
    update: {},
  });

  await prisma.borrowerAccount.upsert({
    where: { userId: borrowerUser.id },
    create: { userId: borrowerUser.id, borrowerId: borrower.id },
    update: {},
  });

  const startDate = new Date('2025-01-15');
  const loan = await prisma.loan.upsert({
    where: { id: 'demo-loan-id' },
    create: {
      id: 'demo-loan-id',
      tenantId: tenant.id,
      borrowerId: borrower.id,
      productId: product.id,
      code: 'CR-DEMO-0001',
      principalAmount: 1000000,
      currentBalance: 1000000,
      interestRate: 0.03,
      paymentFrequency: 'monthly',
      startDate,
      endDate: null,
    },
    update: { endDate: null, code: 'CR-DEMO-0001' },
  });

  await prisma.loanTerm.upsert({
    where: { loanId: loan.id },
    create: {
      loanId: loan.id,
      principalAmount: 1000000,
      interestRate: 0.03,
      interestMethod: 'interest_first_monthly',
      paymentFrequency: 'monthly',
      lateFeeRules: { graceDays: 3, dailyRate: 0.001, fixedPenalty: 5000 },
    },
    update: {},
  });

  const firstDue = new Date(startDate);
  firstDue.setMonth(firstDue.getMonth() + 1);
  await prisma.loanInstallment.upsert({
    where: { id: 'demo-installment-1' },
    create: {
      id: 'demo-installment-1',
      loanId: loan.id,
      installmentNumber: 1,
      dueDate: firstDue,
      expectedInterest: 30000,
      expectedPrincipal: 0,
      status: 'pending',
    },
    update: {},
  });

  await prisma.loanBalanceEvent.upsert({
    where: { id: 'demo-balance-event-1' },
    create: {
      id: 'demo-balance-event-1',
      loanId: loan.id,
      eventType: 'disbursement',
      amount: 1000000,
      balanceAfter: 1000000,
      description: 'Desembolso inicial',
    },
    update: {},
  });

  console.log('Seed completed.');
  console.log('Super admin: admin@cartera247.com / Admin123!');
  console.log('Prestamista:  dueno@demo.com / Demo123!');
  console.log('Prestatario:  prestatario@demo.com / Demo123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
