import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { InstallmentSchedulerService } from './installment-scheduler.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  providers: [LoansService, InstallmentSchedulerService],
  controllers: [LoansController],
  exports: [LoansService, InstallmentSchedulerService],
})
export class LoansModule {}
