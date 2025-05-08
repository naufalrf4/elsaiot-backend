import { BaseSocketEvent } from './base-socket-event';

/**
 * Event for offset configuration updates
 */
export class OffsetStatusEvent extends BaseSocketEvent {
  protected readonly eventName = 'offset.status';
} 