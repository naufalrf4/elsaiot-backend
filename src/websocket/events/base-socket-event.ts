import { Logger } from '@nestjs/common';
import { SocketClientService } from '../services/socket-client.service';
import { SocketEventData, SocketEventEmitter } from '../interfaces/socket-event.interface';

/**
 * Base class for all socket events
 */
export abstract class BaseSocketEvent implements SocketEventEmitter {
  protected abstract readonly eventName: string;
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly socketClientService: SocketClientService,
    protected readonly data: SocketEventData,
    protected readonly message?: string,
  ) {}

  /**
   * Emit this event to a specific user
   * @param userId The user ID
   */
  emit(userId: string): void {
    this.socketClientService.emitToUser(
      userId,
      this.eventName,
      this.data,
      this.message,
    );
    this.logger.debug(`Emitted ${this.eventName} to user:${userId}`);
  }

  /**
   * Emit this event to a specific device
   * @param deviceId The device ID
   */
  emitToDevice(deviceId: string): void {
    this.socketClientService.emitToDevice(
      deviceId,
      this.eventName,
      this.data,
      this.message,
    );
    this.logger.debug(`Emitted ${this.eventName} to device:${deviceId}`);
  }
} 