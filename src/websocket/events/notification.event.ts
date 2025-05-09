import { BaseSocketEvent } from './base-socket-event';

export class NotificationEvent extends BaseSocketEvent {
  protected readonly eventName = 'notification.received';
} 