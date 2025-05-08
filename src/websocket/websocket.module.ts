import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { DevicesModule } from '../devices/devices.module';
import { UsersModule } from '../users/users.module';
import { SocketGateway } from './gateways/socket.gateway';
import { SocketRoomService } from './services/socket-room.service';
import { SocketClientService } from './services/socket-client.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { MqttEventListener } from './listeners/mqtt-event.listener';
import { DeviceStatusListener } from './listeners/device-status.listener';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    AuthModule,
    DevicesModule,
    UsersModule,
  ],
  providers: [
    SocketGateway,
    SocketRoomService,
    SocketClientService,
    WsJwtGuard,
    MqttEventListener,
    DeviceStatusListener,
  ],
  exports: [
    SocketClientService,
    SocketRoomService,
  ],
})
export class WebsocketModule {} 