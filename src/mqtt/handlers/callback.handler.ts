import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeviceRepository } from '../../devices/repositories/device.repository';
import { CallbackDto } from '../dto/callback.dto';
import {
  CallbackPayload,
  CallbackStatus,
  MqttMessage,
} from '../interfaces/mqtt-message.interface';
import { MessageType } from '../interfaces/mqtt-topic.interface';
import { MqttTopicService } from '../services/mqtt-topic.service';
import { BaseMqttHandler } from './base.handler';

@Injectable()
export class CallbackHandler extends BaseMqttHandler {
  protected readonly messageType = MessageType.CALLBACK;
  protected readonly logger = new Logger(CallbackHandler.name);

  constructor(
    protected readonly topicService: MqttTopicService,
    private readonly deviceRepository: DeviceRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(topicService);
  }

  protected getDtoClass() {
    return CallbackDto;
  }

  protected async processMessage(
    message: MqttMessage,
    payload: CallbackPayload,
  ): Promise<void> {
    try {
      // Look up device by device code
      const device = await this.deviceRepository.findByDeviceCode(
        message.deviceCode,
      );

      // Skip processing if device not found or not paired
      if (!device || !device.userId) {
        this.logger.warn(
          `Ignoring callback from unpaired device: ${message.deviceCode}`,
        );
        return;
      }

      // Update device status
      await this.deviceRepository.updateDeviceStatus(device.id, device.status);
      await this.deviceRepository.updateLastOnline(device.id);

      // Log the callback result
      if (payload.status === CallbackStatus.SUCCESS) {
        this.logger.log(
          `Successfully processed ${payload.action} for ${payload.sensor} on device ${device.id}`,
        );
      } else {
        this.logger.warn(
          `Failed to process ${payload.action} for ${payload.sensor} on device ${device.id}: ${payload.message || 'No error message provided'}`,
        );
      }

      // Emit internal event for the calibration result
      this.eventEmitter.emit('calibration.completed', {
        deviceId: device.id,
        userId: device.userId,
        requestId: payload.request_id,
        sensorType: payload.sensor,
        action: payload.action,
        status: payload.status,
        message: payload.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Error processing callback message: ${error.message}`,
        error.stack,
      );
    }
  }
}
