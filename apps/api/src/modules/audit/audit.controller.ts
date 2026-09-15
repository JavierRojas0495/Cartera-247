import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/auth.decorators';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string) {
    if (!user.tenantId) return [];
    return this.auditService.findByTenant(user.tenantId, limit ? parseInt(limit) : 50);
  }
}
