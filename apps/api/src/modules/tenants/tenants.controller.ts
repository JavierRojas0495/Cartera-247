import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  ActivateModuleDto,
  SupportSessionDto,
} from './dto/tenant.dto';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformAdminOnly, CurrentUser, ClientIp, JwtPayload } from '../../common/decorators/auth.decorators';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @PlatformAdminOnly()
  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @PlatformAdminOnly()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @PlatformAdminOnly()
  @Post()
  create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: JwtPayload,
    @ClientIp() ip: string,
  ) {
    return this.tenantsService.create(dto, user.sub, ip);
  }

  @PlatformAdminOnly()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: JwtPayload,
    @ClientIp() ip: string,
  ) {
    return this.tenantsService.update(id, dto, user.sub, ip);
  }

  @PlatformAdminOnly()
  @Post(':id/modules')
  activateModule(
    @Param('id') id: string,
    @Body() dto: ActivateModuleDto,
    @CurrentUser() user: JwtPayload,
    @ClientIp() ip: string,
  ) {
    return this.tenantsService.activateModule(id, dto, user.sub, ip);
  }

  @PlatformAdminOnly()
  @Post(':id/modules/:code/deactivate')
  deactivateModule(
    @Param('id') id: string,
    @Param('code') code: string,
    @CurrentUser() user: JwtPayload,
    @ClientIp() ip: string,
  ) {
    return this.tenantsService.deactivateModule(id, code, user.sub, ip);
  }

  @PlatformAdminOnly()
  @Post(':id/support-session')
  supportSession(
    @Param('id') id: string,
    @Body() dto: SupportSessionDto,
    @CurrentUser() user: JwtPayload,
    @ClientIp() ip: string,
  ) {
    return this.tenantsService.startSupportSession(id, user.sub, dto, ip);
  }
}
