import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UserRepository } from '../../users/repositories/user.repository';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        throw new WsException('Authentication token not found');
      }
      
      const user = await this.validateToken(token);
      
      if (!user) {
        this.logger.warn(`Client ${client.id} attempted connection with invalid token`);
        throw new WsException('Invalid authentication token');
      }
      
      client.data.user = user;
      return true;
    } catch (error) {
      this.logger.error(`WebSocket authentication error: ${error.message}`);
      throw new WsException('Unauthorized');
    }
  }
  
  private extractToken(client: Socket): string | null {
    const handshake = client.handshake;
    if (handshake?.query?.token) {
      return handshake.query.token as string;
    }
    return null;
  }
  
  private async validateToken(token: string): Promise<any> {
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