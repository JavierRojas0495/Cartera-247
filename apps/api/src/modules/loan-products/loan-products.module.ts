import { Module } from '@nestjs/common';
import { LoanProductsService } from './loan-products.service';
import { LoanProductsController } from './loan-products.controller';

@Module({
  providers: [LoanProductsService],
  controllers: [LoanProductsController],
  exports: [LoanProductsService],
})
export class LoanProductsModule {}
