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
    const room = this.socketRoomService.getUserRoom(userId);
    this.server.to(room).emit(event, this.formatResponse(event, data, message));
    this.logger.debug(`Emitted ${event} to ${room}`);
  }

  emitToDevice(deviceId: string, event: string, data: any, message?: string): void {
    const room = this.socketRoomService.getDeviceRoom(deviceId);
    this.server.to(room).emit(event, this.formatResponse(event, data, message));
    this.logger.debug(`Emitted ${event} to ${room}`);
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