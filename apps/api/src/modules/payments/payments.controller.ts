import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { CurrentUser, ClientIp, JwtPayload } from '../../common/decorators/auth.decorators';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Requiere tenant');
    return user.tenantId;
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.findAll(this.requireTenant(user));
  }

  @Get('loan/:loanId')
  findByLoan(@CurrentUser() user: JwtPayload, @Param('loanId') loanId: string) {
    return this.paymentsService.findByLoan(this.requireTenant(user), loanId);
  }

  @Get('borrower/:borrowerId')
  findBorrowerPayments(
    @CurrentUser() user: JwtPayload,
    @Param('borrowerId') borrowerId: string,
  ) {
    return this.paymentsService.findBorrowerPayments(this.requireTenant(user), borrowerId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentDto,
    @ClientIp() ip: string,
  ) {
    return this.paymentsService.create(this.requireTenant(user), dto, user.sub, ip);
  }

  @Post(':id/void')
  voidPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @ClientIp() ip: string,
  ) {
    return this.paymentsService.voidPayment(this.requireTenant(user), id, user.sub, ip);
  }
}
