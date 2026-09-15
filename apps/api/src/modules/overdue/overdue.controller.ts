import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OverdueService } from './overdue.service';
import { CurrentUser, ClientIp, JwtPayload } from '../../common/decorators/auth.decorators';

@ApiTags('overdue')
@ApiBearerAuth()
@Controller('overdue')
export class OverdueController {
  constructor(private overdueService: OverdueService) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Requiere tenant');
    return user.tenantId;
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.overdueService.findAll(this.requireTenant(user));
  }

  @Get('alerts')
  getAlerts(@CurrentUser() user: JwtPayload) {
    return this.overdueService.getAlerts(this.requireTenant(user));
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @ClientIp() ip: string,
  ) {
    return this.overdueService.approve(id, user.sub, this.requireTenant(user), ip);
  }

  @Post(':id/waive')
  waive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @ClientIp() ip: string,
  ) {
    return this.overdueService.waive(id, user.sub, this.requireTenant(user), reason, ip);
  }
}
