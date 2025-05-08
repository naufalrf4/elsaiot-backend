import { Injectable, Logger } from '@nestjs/common';
import { MqttClient } from 'mqtt';
import { BaseMqttHandler } from '../handlers/base.handler';
import { CallbackHandler } from '../handlers/callback.handler';
import { DataHandler } from '../handlers/data.handler';
import { MessageType } from '../interfaces/mqtt-topic.interface';
import { MqttTopicService } from './mqtt-topic.service';
import { IMqttMessage } from '../interfaces/mqtt-message.interface';

@Injectable()
export class MqttMessageProcessorService {
  private readonly logger = new Logger(MqttMessageProcessorService.name);
  private handlers: Map<MessageType, BaseMqttHandler> = new Map();

  constructor(
    private readonly topicService: MqttTopicService,
    private readonly dataHandler: DataHandler,
    private readonly callbackHandler: CallbackHandler,
  ) {
    this.handlers.set(MessageType.DATA, this.dataHandler);
    this.handlers.set(MessageType.CALLBACK, this.callbackHandler);
  }

  setupMessageHandling(client: MqttClient): void {
    this.logger.log('Setting up MQTT message handling');

    client.on('message', async (topic, payload, packet) => {
      try {
        const parsedTopic = this.topicService.parseTopic(topic);

        if (!parsedTopic.isValid) {
          this.logger.warn(`Received message with invalid topic: ${topic}`);
          return;
        }

        const handler = this.handlers.get(parsedTopic.messageType);

        if (!handler) {
          this.logger.warn(
            `No handler registered for message type: ${parsedTopic.messageType}`,
          );
          return;
        }

        await handler.handle(packet as IMqttMessage);
      } catch (error) {
        this.logger.error(
          `Error processing MQTT message: ${error.message}`,
          error.stack,
        );
      }
    });
  }
}
