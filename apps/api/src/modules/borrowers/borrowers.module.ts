import { Module } from '@nestjs/common';
import { BorrowersService } from './borrowers.service';
import { BorrowersController } from './borrowers.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  providers: [BorrowersService],
  controllers: [BorrowersController],
  exports: [BorrowersService],
})
export class BorrowersModule {}
