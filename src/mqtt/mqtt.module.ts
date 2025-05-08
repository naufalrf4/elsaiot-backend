import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { SensorsModule } from '../sensors/sensors.module';
import { CallbackHandler } from './handlers/callback.handler';
import { DataHandler } from './handlers/data.handler';
import { MqttClientService } from './services/mqtt-client.service';
import { MqttMessageProcessorService } from './services/mqtt-message-processor.service';
import { MqttTopicService } from './services/mqtt-topic.service';
import { DeviceStatusTask } from './tasks/device-status.task';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule,
    DevicesModule,
    SensorsModule,
  ],
  controllers: [],
  providers: [
    MqttTopicService,
    MqttMessageProcessorService,
    MqttClientService,
    DataHandler,
    CallbackHandler,
    DeviceStatusTask,
  ],
  exports: [MqttClientService],
})
export class MqttModule {}
