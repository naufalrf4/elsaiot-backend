import { BaseSocketEvent } from './base-socket-event';

export class DeviceStatusEvent extends BaseSocketEvent {
  protected readonly eventName = 'device.status.changed';
} 