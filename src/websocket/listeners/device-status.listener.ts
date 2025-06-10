import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeviceStatusEvent } from '../events/device-status.event';
import { SocketClientService } from '../services/socket-client.service';

@Injectable()
export class DeviceStatusListener implements OnModuleInit {
  private readonly logger = new Logger(DeviceStatusListener.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly socketClientService: SocketClientService,
  ) {}

  onModuleInit() {
    this.registerListeners();
    this.logger.log('Device status listeners registered');
  }

  private registerListeners() {
    this.eventEmitter.on('device.status.changed', (payload) => {
      this.handleDeviceStatusChange(payload);
    });
  }

  private async handleDeviceStatusChange(payload: any) {
    if (!payload) return this.logger.warn('Received empty payload for device status');

    const { deviceId, status, userId, from, to } = payload;
    if (!deviceId) return this.logger.warn('Missing deviceId in status payload');
    if (!userId) return this.logger.warn(`Device ${deviceId} missing userId in status payload`);

    const resolvedStatus = status || to;
    if (!resolvedStatus) return this.logger.warn(`Missing status for device ${deviceId}`);

    try {
      const event = new DeviceStatusEvent(
        this.socketClientService,
        { deviceId, status: resolvedStatus, from },
        `Device is now ${resolvedStatus}`,
      );
      event.emit(userId);

      this.logger.debug(`Device status emitted for device ${deviceId} to user ${userId}`);
    } catch (error) {
      this.logger.error(`Device status handling failed: ${error.message}`, error.stack);
    }
  }
}
