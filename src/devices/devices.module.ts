import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DeviceController } from './controllers/device.controller';
import { Device } from './entities/device.entity';
import { DeviceRepository } from './repositories/device.repository';
import { DeviceService } from './services/device.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceRepository],
  exports: [DeviceService, DeviceRepository],
})
export class DevicesModule {}
