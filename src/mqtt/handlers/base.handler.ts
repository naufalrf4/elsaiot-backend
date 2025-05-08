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

  /**
   * Main handler method to process MQTT messages
   * @param packet - Raw MQTT message
   */
  public async handle(packet: IMqttMessage): Promise<void> {
    try {
      // Parse topic
      const parsedTopic = this.topicService.parseTopic(packet.topic);

      // Validate topic structure
      if (!parsedTopic.isValid) {
        this.logger.warn(`Invalid topic structure: ${packet.topic}`);
        return;
      }

      // Check if this handler is for this message type
      if (parsedTopic.messageType !== this.messageType) {
        return;
      }

      // Parse and validate payload
      const { deviceCode } = parsedTopic;
      const payload = this.parsePayload(packet.payload);

      if (!payload) {
        this.logger.warn(
          `Invalid payload for topic ${packet.topic}: ${packet.payload.toString()}`,
        );
        return;
      }

      // Create structured MQTT message
      const message: MqttMessage = {
        topic: packet.topic,
        payload: packet.payload,
        messageType: parsedTopic.messageType,
        deviceCode,
      };

      // Process the validated message
      await this.processMessage(message, payload);
    } catch (error) {
      this.logger.error(
        `Error handling MQTT message: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Parse and validate the message payload
   * @param payload - Raw message payload
   * @returns Parsed and validated payload or null if invalid
   */
  protected parsePayload<T>(payload: Buffer): T | null {
    try {
      const rawPayload = payload.toString();
      const jsonPayload = JSON.parse(rawPayload);

      // Use class-transformer and class-validator if a DTO class is provided
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

  /**
   * Get the DTO class for validation
   * Override in subclasses to provide specific DTO class
   */
  protected getDtoClass(): any {
    return null;
  }

  /**
   * Process the validated message - to be implemented by subclasses
   * @param message - The structured MQTT message
   * @param payload - The parsed and validated payload
   */
  protected abstract processMessage(
    message: MqttMessage,
    payload: any,
  ): Promise<void>;
}
