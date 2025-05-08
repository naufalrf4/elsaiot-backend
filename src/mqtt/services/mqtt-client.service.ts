import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { IClientOptions, MqttClient } from 'mqtt';
import {
  CalibrationPayload,
  OffsetPayload,
} from '../interfaces/mqtt-message.interface';
import { IMqttClientService } from '../interfaces/mqtt-service.interface';
import {
  MessageType,
  TOPIC_PATTERNS,
} from '../interfaces/mqtt-topic.interface';
import { MqttMessageProcessorService } from './mqtt-message-processor.service';
import { MqttTopicService } from './mqtt-topic.service';

@Injectable()
export class MqttClientService
  implements IMqttClientService, OnModuleInit, OnModuleDestroy
{
  private client: MqttClient;
  private readonly logger = new Logger(MqttClientService.name);
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  constructor(
    private readonly configService: ConfigService,
    private readonly topicService: MqttTopicService,
    private readonly messageProcessor: MqttMessageProcessorService,
  ) {}

  async onModuleInit() {
    await this.connect();
    
    // Set up message handling once connected
    if (this.client) {
      this.messageProcessor.setupMessageHandling(this.client);
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    if (this.client) {
      this.logger.log('MQTT client already exists, skipping connection');
      return;
    }

    const mqttConfig = this.configService.get('mqtt');
    const host = mqttConfig.host;
    const port = mqttConfig.port;
    const protocol = mqttConfig.protocol || 'mqtt';
    const url = `${protocol}://${host}:${port}`;

    const options: IClientOptions = {
      clientId: mqttConfig.clientId || 'elsaiot-backend',
      clean: false,
      connectTimeout: 5000,
      reconnectPeriod: 1000, // Milliseconds
      username: mqttConfig.username,
      password: mqttConfig.password,
    };

    // Add SSL options if using secure protocol
    if (protocol === 'mqtts') {
      options.rejectUnauthorized = mqttConfig.rejectUnauthorized !== false;
      this.logger.log(`SSL verification ${options.rejectUnauthorized ? 'enabled' : 'disabled'}`);
    }

    this.logger.log(`Connecting to MQTT broker at ${url}`);

    try {
      this.client = mqtt.connect(url, options);

      this.client.on('connect', () => {
        this.logger.log('Connected to MQTT broker');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToTopics();
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        this.logger.warn(
          `Reconnecting to MQTT broker, attempt ${this.reconnectAttempts}`,
        );

        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          this.logger.error(
            `Maximum reconnection attempts reached (${this.maxReconnectAttempts})`,
          );
          this.client.end(true);
        }
      });

      this.client.on('error', (error) => {
        this.logger.error(`MQTT client error: ${error.message}`);
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        this.logger.warn('MQTT client offline');
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.log('MQTT connection closed');
      });
    } catch (error) {
      this.logger.error(`Failed to connect to MQTT broker: ${error.message}`);
      throw error;
    }
  }

  getClient(): MqttClient {
    return this.client;
  }

  private async subscribeToTopics(): Promise<void> {
    const topics = [
      TOPIC_PATTERNS[MessageType.DATA].subscription,
      TOPIC_PATTERNS[MessageType.CALLBACK].subscription,
    ];

    await this.subscribe(topics);
  }

  async subscribe(topics: string[]): Promise<void> {
    if (!this.client || !this.isConnected) {
      this.logger.error('Cannot subscribe: MQTT client not connected');
      return;
    }

    const qos = this.configService.get('mqtt').qos || 1;

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos }, (err) => {
        if (err) {
          this.logger.error(`Error subscribing to ${topic}: ${err.message}`);
        } else {
          this.logger.log(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  async publish(topic: string, message: string | Buffer): Promise<void> {
    if (!this.client || !this.isConnected) {
      this.logger.error('Cannot publish: MQTT client not connected');
      throw new Error('MQTT client not connected');
    }

    const qos = this.configService.get('mqtt').qos || 1;

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, { qos }, (err) => {
        if (err) {
          this.logger.error(`Error publishing to ${topic}: ${err.message}`);
          reject(err);
        } else {
          this.logger.debug(`Published to topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  async sendCalibration(
    deviceCode: string,
    payload: CalibrationPayload,
  ): Promise<void> {
    const topic = this.topicService.buildTopic(
      MessageType.CALIBRATION,
      deviceCode,
    );
    await this.publish(topic, JSON.stringify(payload));
  }

  async sendOffset(deviceCode: string, payload: OffsetPayload): Promise<void> {
    const topic = this.topicService.buildTopic(MessageType.OFFSET, deviceCode);
    await this.publish(topic, JSON.stringify(payload));
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      return new Promise((resolve) => {
        this.client.end(true, {}, () => {
          this.logger.log('Disconnected from MQTT broker');
          this.isConnected = false;
          resolve();
        });
      });
    }
  }
} 