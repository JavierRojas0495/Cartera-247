import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ModulesCatalogModule } from './modules/modules-catalog/modules-catalog.module';
import { BorrowersModule } from './modules/borrowers/borrowers.module';
import { LoanProductsModule } from './modules/loan-products/loan-products.module';
import { LoansModule } from './modules/loans/loans.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OverdueModule } from './modules/overdue/overdue.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    ModulesCatalogModule,
    BorrowersModule,
    LoanProductsModule,
    LoansModule,
    PaymentsModule,
    OverdueModule,
    AuditModule,
    ReportsModule,
  ],
})
export class AppModule {}
