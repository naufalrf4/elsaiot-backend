import { BaseSocketEvent } from './base-socket-event';

/**
 * Event for sensor data updates
 */
export class SensorDataEvent extends BaseSocketEvent {
  protected readonly eventName = 'sensor.data.received';
} 