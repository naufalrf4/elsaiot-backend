import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketRoomService } from './socket-room.service';

@Injectable()
export class SocketClientService {
  private readonly logger = new Logger(SocketClientService.name);
  private server: Server;

  constructor(private readonly socketRoomService: SocketRoomService) {}

  /**
   * Set the Socket.IO server instance
   * @param server The Socket.IO server
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Get the Socket.IO server instance
   * @returns The Socket.IO server
   * @throws Error if server is not initialized
   */
  getServer(): Server {
    if (!this.server) {
      throw new Error('Socket.IO server not initialized');
    }
    return this.server;
  }

  /**
   * Emit an event to a specific user
   * @param userId The user ID
   * @param event The event name
   * @param data The event data
   * @param message Optional message to include
   */
  emitToUser(userId: string, event: string, data: any, message?: string): void {
    const room = this.socketRoomService.getUserRoom(userId);
    this.server.to(room).emit(event, this.formatResponse(event, data, message));
    this.logger.debug(`Emitted ${event} to ${room}`);
  }

  /**
   * Emit an event to a specific device
   * @param deviceId The device ID
   * @param event The event name
   * @param data The event data
   * @param message Optional message to include
   */
  emitToDevice(deviceId: string, event: string, data: any, message?: string): void {
    const room = this.socketRoomService.getDeviceRoom(deviceId);
    this.server.to(room).emit(event, this.formatResponse(event, data, message));
    this.logger.debug(`Emitted ${event} to ${room}`);
  }

  /**
   * Format a response for WebSocket emission
   * @param event The event name
   * @param data The event data
   * @param message Optional message to include
   * @returns Formatted response object
   */
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

  /**
   * Get a default message for an event type
   * @param event The event name
   * @returns Default message string
   */
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