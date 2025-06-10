import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import configs from './config';
import { validationSchema } from './config/validation.schema';
import { dataSourceOptions } from './config/data-source';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DevicesModule } from './devices/devices.module';
import { SensorsModule } from './sensors/sensors.module';
import { CalibrationsModule } from './calibrations/calibrations.module';
import { MqttModule } from './mqtt/mqtt.module';
import { WebsocketModule } from './websocket/websocket.module';
import { SharedModule } from './shared/shared.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';

import { GlobalResponseInterceptor } from './shared/interceptors/global-response.interceptor';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import mailConfig from './config/mail.config';
import websocketConfig from './config/websocket.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [...configs, mailConfig, websocketConfig],
      validationSchema,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...dataSourceOptions,
        autoLoadEntities: true,
      }),
    }),

    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),

    SharedModule,
    AuthModule,
    UsersModule,
    DevicesModule,
    SensorsModule,
    CalibrationsModule,
    MqttModule,
    WebsocketModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
