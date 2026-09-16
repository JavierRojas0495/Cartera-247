import { Module } from '@nestjs/common';
import { OverdueService } from './overdue.service';
import { OverdueController } from './overdue.controller';
import { AuditModule } from '../audit/audit.module';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [AuditModule, LoansModule],
  providers: [OverdueService],
  controllers: [OverdueController],
  exports: [OverdueService],
})
export class OverdueModule {}
