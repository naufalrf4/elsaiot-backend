import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeviceRepository } from '../../devices/repositories/device.repository';
import { SensorLogRepository } from '../../sensors/repositories/sensor-log.repository';
import { SensorDataDto } from '../dto/sensor-data.dto';
import { MqttMessage, SensorDataPayload } from '../interfaces/mqtt-message.interface';
import { MessageType } from '../interfaces/mqtt-topic.interface';
import { MqttTopicService } from '../services/mqtt-topic.service';
import { BaseMqttHandler } from './base.handler';

@Injectable()
export class DataHandler extends BaseMqttHandler {
  protected readonly messageType = MessageType.DATA;
  protected readonly logger = new Logger(DataHandler.name);

  private lastStoredAt: Map<string, number> = new Map(); // deviceCode -> timestamp
  private latestPayload: Map<string, { message: MqttMessage, payload: SensorDataPayload }> = new Map();

  constructor(
    protected readonly topicService: MqttTopicService,
    private readonly deviceRepository: DeviceRepository,
    private readonly sensorLogRepository: SensorLogRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(topicService);

    setInterval(() => this.flushBufferedPayloads(), 1000);
  }

  protected getDtoClass() {
    return SensorDataDto;
  }

  protected async processMessage(
    message: MqttMessage,
    payload: SensorDataPayload,
  ): Promise<void> {
    const key = message.deviceCode;
    this.latestPayload.set(key, { message, payload });
  }

  private async flushBufferedPayloads() {
    const now = Date.now();

    for (const [deviceCode, { message, payload }] of this.latestPayload.entries()) {
      const last = this.lastStoredAt.get(deviceCode) || 0;

      if (now - last >= 10_000) {
        try {
          const device = await this.deviceRepository.findByDeviceCode(deviceCode);
          if (!device || !device.userId) {
            this.logger.warn(`Ignoring data from unpaired device: ${deviceCode}`);
            continue;
          }

          const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

          await this.sensorLogRepository.storeSensorData({
            deviceId: device.id,
            timestamp,
            ph: payload.ph,
            tds: payload.tds,
            dissolvedOxygen: payload.dissolved_oxygen,
            temperature: payload.temperature,
          });

          await this.deviceRepository.updateLastOnline(device.id);
          this.lastStoredAt.set(deviceCode, now);
          this.logger.debug(`Stored throttled sensor data from device ${device.id} (${deviceCode})`);
          
          // Emit event for WebSocket integration
          this.eventEmitter.emit('sensor.data.received', {
            deviceId: device.id,
            timestamp: timestamp.toISOString(),
            ph: payload.ph,
            tds: payload.tds,
            dissolved_oxygen: payload.dissolved_oxygen,
            temperature: payload.temperature,
            userId: device.userId,
          });
        } catch (error) {
          this.logger.error(`Error in throttled data store: ${error.message}`, error.stack);
        }
      }
    }
  }
}
