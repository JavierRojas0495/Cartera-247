import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/auth.decorators';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Requiere tenant');
    return user.tenantId;
  }

  @Get('portfolio')
  portfolio(@CurrentUser() user: JwtPayload) {
    return this.reportsService.portfolioSummary(this.requireTenant(user));
  }

  @Get('payments')
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  payments(
    @CurrentUser() user: JwtPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.paymentsByPeriod(this.requireTenant(user), from, to);
  }

  @Get('debt')
  debt(@CurrentUser() user: JwtPayload) {
    return this.reportsService.debtReport(this.requireTenant(user));
  }

  @Get('clients')
  clients(@CurrentUser() user: JwtPayload) {
    return this.reportsService.clientsReport(this.requireTenant(user));
  }
}
