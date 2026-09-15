import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { InstallmentSchedulerService } from './installment-scheduler.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [LoansService, InstallmentSchedulerService],
  controllers: [LoansController],
  exports: [LoansService, InstallmentSchedulerService],
})
export class LoansModule {}
