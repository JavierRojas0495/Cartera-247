import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [LoansModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
