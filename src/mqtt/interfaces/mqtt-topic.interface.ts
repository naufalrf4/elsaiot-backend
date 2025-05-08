import { ConfigService } from '@nestjs/config';

export enum MessageType {
  DATA = 'data',
  CALLBACK = 'callback',
  CALIBRATION = 'calibration',
  OFFSET = 'offset',
}

export interface ParsedTopic {
  deviceCode: string;
  messageType: MessageType;
  isValid: boolean;
}

export interface TopicPattern {
  pattern: string;
  subscription: string;
  isPublish: boolean;
}

// Get topic prefix from environment variables or fallback to 'elsaiot'
export const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'elsaiot';

export const TOPIC_PATTERNS: Record<MessageType, TopicPattern> = {
  [MessageType.DATA]: {
    pattern: `${TOPIC_PREFIX}/{device_code}/data`,
    subscription: `${TOPIC_PREFIX}/+/data`,
    isPublish: false,
  },
  [MessageType.CALLBACK]: {
    pattern: `${TOPIC_PREFIX}/{device_code}/callback`,
    subscription: `${TOPIC_PREFIX}/+/callback`,
    isPublish: false,
  },
  [MessageType.CALIBRATION]: {
    pattern: `${TOPIC_PREFIX}/{device_code}/calibration`,
    subscription: `${TOPIC_PREFIX}/+/calibration`,
    isPublish: true,
  },
  [MessageType.OFFSET]: {
    pattern: `${TOPIC_PREFIX}/{device_code}/offset`,
    subscription: `${TOPIC_PREFIX}/+/offset`,
    isPublish: true,
  },
};
