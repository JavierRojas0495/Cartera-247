import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BorrowersService } from './borrowers.service';
import {
  CreateBorrowerDto,
  UpdateBorrowerDto,
  CreateFieldDefinitionDto,
} from './dto/borrower.dto';
import { CurrentUser, ClientIp, JwtPayload } from '../../common/decorators/auth.decorators';

@ApiTags('borrowers')
@ApiBearerAuth()
@Controller('borrowers')
export class BorrowersController {
  constructor(private borrowersService: BorrowersService) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Requiere tenant');
    return user.tenantId;
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.borrowersService.findAll(this.requireTenant(user));
  }

  @Get('field-definitions')
  getFieldDefinitions(@CurrentUser() user: JwtPayload) {
    return this.borrowersService.getFieldDefinitions(this.requireTenant(user));
  }

  @Post('field-definitions')
  createFieldDefinition(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFieldDefinitionDto,
  ) {
    return this.borrowersService.createFieldDefinition(this.requireTenant(user), dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.borrowersService.findOne(this.requireTenant(user), id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBorrowerDto,
    @ClientIp() ip: string,
  ) {
    return this.borrowersService.create(this.requireTenant(user), dto, user.sub, ip);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBorrowerDto,
    @ClientIp() ip: string,
  ) {
    return this.borrowersService.update(this.requireTenant(user), id, dto, user.sub, ip);
  }
}
