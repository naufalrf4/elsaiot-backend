import { BaseSocketEvent } from './base-socket-event';

/**
 * Event for notifications
 */
export class NotificationEvent extends BaseSocketEvent {
  protected readonly eventName = 'notification.received';
} 