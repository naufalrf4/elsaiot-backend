import { Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [],
  controllers: [],
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class SharedModule {} 