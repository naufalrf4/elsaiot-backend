import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceRepository } from '../../devices/repositories/device.repository';
import { DeviceStatus } from '../../shared/enums/app.enum';

/**
 * Task that periodically checks device status and marks devices as offline
 * if no message has been received within the configured timeout period.
 */
@Injectable()
export class DeviceStatusTask {
  private readonly logger = new Logger(DeviceStatusTask.name);
  private readonly offlineThresholdSeconds = 60; 

  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Scheduled task that runs every 30 seconds to check device status
   * and mark devices as offline if they haven't sent a message in the last 60 seconds.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkDeviceStatus(): Promise<void> {
    try {
      this.logger.debug('Running device status check');

      // Get timestamp threshold for offline detection
      const offlineThreshold = new Date();
      offlineThreshold.setSeconds(
        offlineThreshold.getSeconds() - this.offlineThresholdSeconds,
      );

      // Get devices that are currently online but haven't sent a message since the threshold
      const devicesToMarkOffline =
        await this.deviceRepository.findDevicesToMarkOffline(offlineThreshold);

      if (devicesToMarkOffline.length === 0) {
        this.logger.debug('No devices need to be marked offline');
        return;
      }

      this.logger.log(
        `Marking ${devicesToMarkOffline.length} devices as offline`,
      );

      // Update each device and emit events
      for (const device of devicesToMarkOffline) {
        await this.deviceRepository.updateDeviceStatus(
          device.id,
          DeviceStatus.OFFLINE,
        );

        // Emit event for status change
        this.eventEmitter.emit('device.status.changed', {
          deviceId: device.id,
          userId: device.userId,
          status: DeviceStatus.OFFLINE,
          timestamp: new Date().toISOString(),
        });

        this.logger.debug(`Device ${device.id} marked as offline`);
      }
    } catch (error) {
      this.logger.error(
        `Error in device status check: ${error.message}`,
        error.stack,
      );
    }
  }
}
