import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeviceRepository } from '../../devices/repositories/device.repository';
import { SensorLogRepository } from '../../sensors/repositories/sensor-log.repository';
import { MqttMessage, SensorDataPayload } from '../interfaces/mqtt-message.interface';
import { MessageType } from '../interfaces/mqtt-topic.interface';
import { MqttTopicService } from '../services/mqtt-topic.service';
import { BaseMqttHandler } from './base.handler';

@Injectable()
export class DataHandler extends BaseMqttHandler {
  protected readonly messageType = MessageType.DATA;
  protected readonly logger = new Logger(DataHandler.name);

  private lastStoredAt: Map<string, number> = new Map();
  private latestPayload: Map<string, { message: MqttMessage; payload: {
    timestamp?: string;
    ph: number;
    tds: number;
    dissolvedOxygen: number;
    temperature: number;
  } }> = new Map();

  constructor(
    protected readonly topicService: MqttTopicService,
    private readonly deviceRepository: DeviceRepository,
    private readonly sensorLogRepository: SensorLogRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(topicService);
    setInterval(() => this.flushBufferedPayloads(), 1000);
  }

  protected async processMessage(
    message: MqttMessage,
    payload: SensorDataPayload,
  ): Promise<void> {
    const key = message.deviceCode;

    const rawOnly = {
      timestamp: payload.timestamp,
      ph: payload.ph?.raw ?? null,
      tds: payload.tds?.raw ?? null,
      dissolvedOxygen: payload.do?.raw ?? null,
      temperature: payload.temperature?.value ?? null,
    };

    this.latestPayload.set(key, { message, payload: rawOnly });

    try {
      const device = await this.deviceRepository.findByDeviceCode(key);
      if (device && device.userId) {
        this.eventEmitter.emit('sensor.data.received', {
          ...payload,
          deviceId: device.id,
          userId: device.userId,
        });
        this.logger.debug(`Real-time event emitted for device ${key}`);
      } else {
        this.logger.warn(`Device not found or not paired for real-time event: ${key}`);
      }
    } catch (error) {
      this.logger.error(`Error emitting real-time sensor data event: ${error.message}`, error.stack);
    }
  }

  private async flushBufferedPayloads() {
    const now = Date.now();

    for (const [deviceCode, { message, payload }] of this.latestPayload.entries()) {
      const last = this.lastStoredAt.get(deviceCode) || 0;

      if (now - last >= 30_000) { // Changed to 30 seconds
        try {
          const device = await this.deviceRepository.findByDeviceCode(deviceCode);
          if (!device || !device.userId) {
            this.logger.warn(`IGNORING: Menerima data dari alat yang belum pairing (${deviceCode})`);
            continue;
          }

          const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

          await this.sensorLogRepository.storeSensorData({
            deviceId: device.id,
            timestamp,
            ph: payload.ph ?? null,
            tds: payload.tds ?? null,
            dissolvedOxygen: payload.dissolvedOxygen ?? null,
            temperature: payload.temperature ?? null,
          });

          await this.deviceRepository.updateLastOnline(device.id);
          this.lastStoredAt.set(deviceCode, now);
          this.logger.debug(`Data disimpan ke database dari alat (${deviceCode})`);
          // Event emission moved to processMessage for immediate forwarding
        } catch (error) {
          this.logger.error(`Kesalahan dalam penyimpanan data: ${error.message}`, error.stack);
        }
      }
    }
  }
}

