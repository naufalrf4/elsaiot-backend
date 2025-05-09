import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketRoomService } from './socket-room.service';

@Injectable()
export class SocketClientService {
  private readonly logger = new Logger(SocketClientService.name);
  private server: Server;

  constructor(private readonly socketRoomService: SocketRoomService) {}

  setServer(server: Server): void {
    this.server = server;
  }

  getServer(): Server {
    if (!this.server) {
      throw new Error('Socket.IO server not initialized');
    }
    return this.server;
  }

  emitToUser(userId: string, event: string, data: any, message?: string): void {
    try {
      if (!this.server) {
        this.logger.warn('Cannot emit event: Socket.IO server not initialized');
        return;
      }

      if (!userId) {
        this.logger.warn(`Cannot emit ${event}: userId is undefined or null`);
        return;
      }

      const room = this.socketRoomService.getUserRoom(userId);
      if (!room) {
        this.logger.warn(`Cannot emit ${event}: room is undefined for user ${userId}`);
        return;
      }

      this.server.to(room).emit(event, this.formatResponse(event, data, message));
      this.logger.debug(`Emitted ${event} to ${room}`);
    } catch (error) {
      this.logger.error(`Error emitting to user ${userId}: ${error.message}`);
    }
  }

  emitToDevice(deviceId: string, event: string, data: any, message?: string): void {
    try {
      if (!this.server) {
        this.logger.warn('Cannot emit event: Socket.IO server not initialized');
        return;
      }

      if (!deviceId) {
        this.logger.warn(`Cannot emit ${event}: deviceId is undefined or null`);
        return;
      }

      const room = this.socketRoomService.getDeviceRoom(deviceId);
      if (!room) {
        this.logger.warn(`Cannot emit ${event}: room is undefined for device ${deviceId}`);
        return;
      }

      this.server.to(room).emit(event, this.formatResponse(event, data, message));
      this.logger.debug(`Emitted ${event} to ${room}`);
    } catch (error) {
      this.logger.error(`Error emitting to device ${deviceId}: ${error.message}`);
    }
  }

  formatResponse(event: string, data: any, message?: string): any {
    return {
      status: true,
      message: message || this.getDefaultMessage(event),
      data,
      meta: {
        event,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private getDefaultMessage(event: string): string {
    const eventMap = {
      'sensor.data.received': 'Sensor data received',
      'device.status.changed': 'Device status changed',
      'calibration.status': 'Calibration status updated',
      'notification.received': 'New notification received',
      'offset.status': 'Offset configuration updated',
    };

    return eventMap[event] || 'Event received';
  }
} 