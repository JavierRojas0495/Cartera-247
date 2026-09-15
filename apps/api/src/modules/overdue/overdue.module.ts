import { Module } from '@nestjs/common';
import { OverdueService } from './overdue.service';
import { OverdueController } from './overdue.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [OverdueService],
  controllers: [OverdueController],
  exports: [OverdueService],
})
export class OverdueModule {}
