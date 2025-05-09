import { BaseSocketEvent } from './base-socket-event';

export class CalibrationStatusEvent extends BaseSocketEvent {
  protected readonly eventName = 'calibration.status';
} 