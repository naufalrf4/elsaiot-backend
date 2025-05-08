import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorLog } from './entities/sensor-log.entity';
import { FishProfile } from './entities/fish-profile.entity';
import { SensorLogRepository } from './repositories/sensor-log.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([SensorLog, FishProfile]),
  ],
  controllers: [],
  providers: [SensorLogRepository],
  exports: [SensorLogRepository, TypeOrmModule],
})
export class SensorsModule {} 