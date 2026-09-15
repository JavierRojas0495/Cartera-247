import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.module';

@ApiTags('modules')
@ApiBearerAuth()
@Controller('modules')
export class ModulesCatalogController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.module.findMany({ orderBy: { code: 'asc' } });
  }
}
