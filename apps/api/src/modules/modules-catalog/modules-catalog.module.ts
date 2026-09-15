import { Module } from '@nestjs/common';
import { ModulesCatalogController } from './modules-catalog.controller';

@Module({
  controllers: [ModulesCatalogController],
})
export class ModulesCatalogModule {}
