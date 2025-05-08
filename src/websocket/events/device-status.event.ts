import { BaseSocketEvent } from './base-socket-event';

/**
 * Event for device status changes
 */
export class DeviceStatusEvent extends BaseSocketEvent {
  protected readonly eventName = 'device.status.changed';
} 