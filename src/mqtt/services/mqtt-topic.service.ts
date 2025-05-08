import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessageType,
  ParsedTopic,
  TOPIC_PATTERNS,
} from '../interfaces/mqtt-topic.interface';

@Injectable()
export class MqttTopicService {
  private readonly logger = new Logger(MqttTopicService.name);
  private readonly topicPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.topicPrefix = this.configService.get('mqtt.topicPrefix') || 'elsaiot';
  }

  parseTopic(topic: string): ParsedTopic {
    const result: ParsedTopic = {
      deviceCode: '',
      messageType: null as unknown as MessageType,
      isValid: false,
    };

    if (!topic || typeof topic !== 'string') {
      this.logger.warn(`Invalid topic format: ${topic}`);
      return result;
    }

    const segments = topic.split('/');

    if (segments.length !== 3) {
      this.logger.warn(
        `Invalid topic segment count: ${segments.length}, expected 3`,
      );
      return result;
    }

    if (segments[0] !== this.topicPrefix) {
      this.logger.warn(
        `Invalid topic prefix: ${segments[0]}, expected ${this.topicPrefix}`,
      );
      return result;
    }

    const deviceCode = segments[1];
    if (!deviceCode || deviceCode === '+' || deviceCode === '#') {
      this.logger.warn(`Invalid device code in topic: ${deviceCode}`);
      return result;
    }

    const messageTypeStr = segments[2];
    let messageType: MessageType;

    switch (messageTypeStr) {
      case MessageType.DATA:
        messageType = MessageType.DATA;
        break;
      case MessageType.CALLBACK:
        messageType = MessageType.CALLBACK;
        break;
      case MessageType.CALIBRATION:
        messageType = MessageType.CALIBRATION;
        break;
      case MessageType.OFFSET:
        messageType = MessageType.OFFSET;
        break;
      default:
        this.logger.warn(`Unknown message type in topic: ${messageTypeStr}`);
        return result;
    }

    return {
      deviceCode,
      messageType,
      isValid: true,
    };
  }

  buildTopic(messageType: MessageType, deviceCode: string): string {
    if (!Object.values(MessageType).includes(messageType)) {
      throw new Error(`Invalid message type: ${messageType}`);
    }

    if (!deviceCode) {
      throw new Error('Device code is required');
    }

    return `${this.topicPrefix}/${deviceCode}/${messageType}`;
  }

  getSubscriptionTopics(): string[] {
    const patterns = {
      [MessageType.DATA]: {
        subscription: `${this.topicPrefix}/+/data`,
        isPublish: false,
      },
      [MessageType.CALLBACK]: {
        subscription: `${this.topicPrefix}/+/callback`,
        isPublish: false,
      },
      [MessageType.CALIBRATION]: {
        subscription: `${this.topicPrefix}/+/calibration`,
        isPublish: true,
      },
      [MessageType.OFFSET]: {
        subscription: `${this.topicPrefix}/+/offset`,
        isPublish: true,
      },
    };

    return Object.values(MessageType)
      .filter((type) => !patterns[type].isPublish)
      .map((type) => patterns[type].subscription);
  }
}
