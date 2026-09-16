import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto, UpdateLoanDto } from './dto/loan.dto';
import { CurrentUser, ClientIp, JwtPayload } from '../../common/decorators/auth.decorators';

@ApiTags('loans')
@ApiBearerAuth()
@Controller('loans')
export class LoansController {
  constructor(private loansService: LoansService) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Requiere tenant');
    return user.tenantId;
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.loansService.findAll(this.requireTenant(user));
  }

  @Get(':id/debt-summary')
  debtSummary(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('asOf') asOf?: string,
  ) {
    return this.loansService.getDebtSummary(this.requireTenant(user), id, asOf);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loansService.findOne(this.requireTenant(user), id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLoanDto,
    @ClientIp() ip: string,
  ) {
    return this.loansService.create(this.requireTenant(user), dto, user.sub, ip);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLoanDto,
    @ClientIp() ip: string,
  ) {
    return this.loansService.update(this.requireTenant(user), id, dto, user.sub, ip);
  }
}
