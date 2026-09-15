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
import { LoanProductsService } from './loan-products.service';
import { CreateLoanProductDto, UpdateLoanProductDto } from './dto/loan-product.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/auth.decorators';

@ApiTags('loan-products')
@ApiBearerAuth()
@Controller('loan-products')
export class LoanProductsController {
  constructor(private loanProductsService: LoanProductsService) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Requiere tenant');
    return user.tenantId;
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.loanProductsService.findAll(this.requireTenant(user));
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loanProductsService.findOne(this.requireTenant(user), id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLoanProductDto) {
    return this.loanProductsService.create(this.requireTenant(user), dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLoanProductDto,
  ) {
    return this.loanProductsService.update(this.requireTenant(user), id, dto);
  }
}
