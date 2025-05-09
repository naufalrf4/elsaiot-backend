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
      this.logger.debug(`Device status payload: ${JSON.stringify(payload || {})}`);
      
      if (!payload) {
        this.logger.warn('Received undefined or null payload for device status change');
        return;
      }

      const { deviceId, status, userId, from, to } = payload;

      if (!deviceId) {
        this.logger.warn('Received device status without deviceId');
        return;
      }

      if (!userId) {
        this.logger.warn(`Received device status for device ${deviceId} without userId`);
        return;
      }

      const deviceStatus = status || to;
      
      if (!deviceStatus) {
        this.logger.warn(`Received device status for device ${deviceId} without status/to value`);
        return;
      }

      const deviceStatusEvent = new DeviceStatusEvent(
        this.socketClientService,
        { deviceId, status: deviceStatus, from },
        `Device is now ${deviceStatus}`
      );

      deviceStatusEvent.emit(userId);

      this.logger.debug(`Emitted device status for device ${deviceId} to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error handling device status: ${error.message}`, error.stack);
    }
  }
} 