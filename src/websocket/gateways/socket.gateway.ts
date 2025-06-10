import { 
  WebSocketGateway, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
  OnGatewayInit, 
  WebSocketServer 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SocketRoomService } from '../services/socket-room.service';
import { DeviceRepository } from '../../devices/repositories/device.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { SocketClientService } from '../services/socket-client.service';

@WebSocketGateway()
@Injectable()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(SocketGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly socketRoomService: SocketRoomService,
    private readonly deviceRepository: DeviceRepository,
    private readonly userRepository: UserRepository,
    private readonly socketClientService: SocketClientService,
  ) {}

  afterInit() {
    this.socketClientService.setServer(this.server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      
      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        this.handleDisconnect(client);
        return;
      }

      const secret = this.configService.get<string>('auth.jwt.secret');
      let payload;
      
      try {
        payload = this.jwtService.verify(token, { secret });
      } catch (error) {
        this.logger.error(`Token verification error: ${error.message}`);
        this.handleDisconnect(client);
        return;
      }
      
      const { sub: userId } = payload;
      const user = await this.userRepository.findByIdWithoutPassword(userId);
      
      if (!user) {
        this.logger.warn(`Client ${client.id} attempted connection with invalid user`);
        this.handleDisconnect(client);
        return;
      }

      client.data.user = user;
      
      await this.socketRoomService.assignUserToRooms(client, user.id, this.deviceRepository);
      
      this.logger.log(`Client connected: ${client.id} (User: ${user.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      this.handleDisconnect(client);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    client.disconnect();
  }
}