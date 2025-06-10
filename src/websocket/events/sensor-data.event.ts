import { BaseSocketEvent } from './base-socket-event';

export class SensorDataEvent extends BaseSocketEvent {
  protected readonly eventName = 'sensor.data.received';
}
