import { Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { IMqttMessage, MqttMessage } from '../interfaces/mqtt-message.interface';
import { MessageType } from '../interfaces/mqtt-topic.interface';
import { MqttTopicService } from '../services/mqtt-topic.service';

export abstract class BaseMqttHandler {
  protected abstract readonly messageType: MessageType;
  protected abstract readonly logger: Logger;

  constructor(protected readonly topicService: MqttTopicService) {}

  public async handle(packet: IMqttMessage): Promise<void> {
    try {
      const parsedTopic = this.topicService.parseTopic(packet.topic);

      if (!parsedTopic.isValid) {
        this.logger.warn(`Invalid topic structure: ${packet.topic}`);
        return;
      }

      if (parsedTopic.messageType !== this.messageType) {
        return;
      }

      const { deviceCode } = parsedTopic;
      const payload = this.parsePayload(packet.payload);

      if (!payload) {
        this.logger.warn(
          `Invalid payload for topic ${packet.topic}: ${packet.payload.toString()}`,
        );
        return;
      }

      const message: MqttMessage = {
        topic: packet.topic,
        payload: packet.payload,
        messageType: parsedTopic.messageType,
        deviceCode,
      };

      await this.processMessage(message, payload);
    } catch (error) {
      this.logger.error(
        `Error handling MQTT message: ${error.message}`,
        error.stack,
      );
    }
  }

  protected parsePayload<T>(payload: Buffer): T | null {
    try {
      const rawPayload = payload.toString();
      const jsonPayload = JSON.parse(rawPayload);

      if (this.getDtoClass()) {
        const dto = plainToInstance(this.getDtoClass(), jsonPayload);
        const errors = validateSync(dto);

        if (errors.length > 0) {
          const errorMessages = errors
            .map((error) => Object.values(error.constraints || {}))
            .flat()
            .join(', ');

          this.logger.warn(`Payload validation failed: ${errorMessages}`);
          return null;
        }

        return dto as unknown as T;
      }

      return jsonPayload;
    } catch (error) {
      this.logger.warn(`Failed to parse payload: ${error.message}`);
      return null;
    }
  }

  protected getDtoClass(): any {
    return null;
  }

  protected abstract processMessage(
    message: MqttMessage,
    payload: any,
  ): Promise<void>;
}
