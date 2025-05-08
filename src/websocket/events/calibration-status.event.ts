import { BaseSocketEvent } from './base-socket-event';

/**
 * Event for calibration status updates
 */
export class CalibrationStatusEvent extends BaseSocketEvent {
  protected readonly eventName = 'calibration.status';
} 