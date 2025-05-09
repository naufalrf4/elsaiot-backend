import { BaseSocketEvent } from './base-socket-event';

export class OffsetStatusEvent extends BaseSocketEvent {
  protected readonly eventName = 'offset.status';
} 