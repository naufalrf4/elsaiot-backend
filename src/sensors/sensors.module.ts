import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorLog } from './entities/sensor-log.entity';
import { FishProfile } from './entities/fish-profile.entity';
import { SensorLogRepository } from './repositories/sensor-log.repository';
import { SensorService } from './services/sensor.service';
import { SensorsController } from './controllers/sensors.controller';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SensorLog, FishProfile]),
    DevicesModule,
  ],
  controllers: [SensorsController],
  providers: [SensorLogRepository, SensorService],
  exports: [SensorLogRepository, SensorService, TypeOrmModule],
})
export class SensorsModule {} 