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
    try {
      const { deviceId, status, userId } = payload;

      if (!deviceId || !userId) {
        this.logger.warn('Received device status without deviceId or userId');
        return;
      }

      const deviceStatusEvent = new DeviceStatusEvent(
        this.socketClientService,
        { deviceId, status },
        `Device is now ${status}`,
      );

      deviceStatusEvent.emit(userId);

      this.logger.debug(`Emitted device status for device ${deviceId} to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error handling device status: ${error.message}`);
    }
  }
} 