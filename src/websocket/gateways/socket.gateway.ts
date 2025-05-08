import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserRepository } from '../../users/repositories/user.repository';
import { DeviceRepository } from '../../devices/repositories/device.repository';
import { SocketClientService } from '../services/socket-client.service';
import { SocketRoomService } from '../services/socket-room.service';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { CurrentUserWs } from '../decorators/current-user-ws.decorator';
import { User } from '../../users/entities/user.entity';
import { SocketClient } from '../interfaces/socket-client.interface';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*',
  },
})
export class SocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly socketClientService: SocketClientService,
    private readonly socketRoomService: SocketRoomService,
    private readonly deviceRepository: DeviceRepository,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initialize the gateway after server creation
   * @param server The Socket.IO server
   */
  afterInit(server: Server): void {
    this.socketClientService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * Handle new client connections
   * @param client The client socket
   */
  async handleConnection(client: SocketClient): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        client.disconnect();
        return;
      }

      const user = await this.validateToken(token);

      if (!user) {
        this.logger.warn(`Client ${client.id} attempted connection with invalid token`);
        client.disconnect();
        return;
      }

      // Store user in client data for later access
      client.data.user = user;

      // Assign user to room for this user and all their devices
      await this.socketRoomService.assignUserToRooms(
        client,
        user.id,
        this.deviceRepository,
      );

      this.logger.log(`Client ${client.id} connected (user: ${user.email})`);
    } catch (error) {
      this.logger.error(`Error handling connection: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnections
   * @param client The client socket
   */
  async handleDisconnect(client: SocketClient): Promise<void> {
    const user = client.data?.user;
    if (user) {
      this.logger.log(
        `Client ${client.id} disconnected (user: ${user.email})`,
      );
    } else {
      this.logger.log(`Client ${client.id} disconnected`);
    }
  }

  /**
   * Test message handler for checking connection
   * @param client The client socket
   * @param payload Any data sent with the event
   * @returns Ping response with timestamp
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('ping')
  handlePing(
    @CurrentUserWs() user: User,
    client: SocketClient,
    payload: any,
  ): any {
    this.logger.debug(`Received ping from client ${client.id} (user: ${user.email})`);
    return {
      event: 'pong',
      data: {
        timestamp: new Date().toISOString(),
        userId: user.id,
      },
    };
  }

  /**
   * Extract the authentication token from the connection handshake
   * @param client The client socket
   * @returns The token string or null if not found
   */
  private extractToken(client: Socket): string | null {
    const handshake = client.handshake;
    if (handshake?.query?.token) {
      return handshake.query.token as string;
    }
    return null;
  }

  /**
   * Validate a JWT token and return the user
   * @param token The JWT token
   * @returns The user or null if invalid
   */
  private async validateToken(token: string): Promise<User | null> {
    try {
      const secret = this.configService.get<string>('auth.jwt.secret');
      const payload = this.jwtService.verify(token, { secret });
      const { sub: userId } = payload;

      return await this.userRepository.findByIdWithoutPassword(userId);
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`);
      return null;
    }
  }
} 