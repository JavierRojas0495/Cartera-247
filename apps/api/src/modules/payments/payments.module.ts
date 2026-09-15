import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentAllocationService } from './payment-allocation.service';
import { AuditModule } from '../audit/audit.module';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [AuditModule, LoansModule],
  providers: [PaymentsService, PaymentAllocationService],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentAllocationService],
})
export class PaymentsModule {}
