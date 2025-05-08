import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Calibration } from './entities/calibration.entity';
import { Offset } from './entities/offset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Calibration, Offset]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class CalibrationsModule {} 