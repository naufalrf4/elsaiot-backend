import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeviceRepository } from '../../devices/repositories/device.repository';
import { CalibrationStatusEvent } from '../events/calibration-status.event';
import { OffsetStatusEvent } from '../events/offset-status.event';
import { SensorDataEvent } from '../events/sensor-data.event';
import { SocketClientService } from '../services/socket-client.service';

@Injectable()
export class MqttEventListener implements OnModuleInit {
  private readonly logger = new Logger(MqttEventListener.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly socketClientService: SocketClientService,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  onModuleInit() {
    this.registerListeners();
    this.logger.log('MQTT event listeners registered');
  }

  private registerListeners() {
    this.eventEmitter.on('sensor.data.received', (payload) => {
      this.handleSensorData(payload);
    });

    this.eventEmitter.on('calibration.completed', (payload) => {
      this.handleCalibrationStatus(payload);
    });

    this.eventEmitter.on('offset.updated', (payload) => {
      this.handleOffsetStatus(payload);
    });
  }

  private async handleSensorData(payload: any) {
    try {
      const { deviceId, ...data } = payload;

      if (!deviceId) {
        this.logger.warn('Received sensor data without deviceId');
        return;
      }

      const device = await this.deviceRepository.findByDeviceId(deviceId);

      if (!device || !device.userId) {
        this.logger.warn(`Device ${deviceId} not found or not paired`);
        return;
      }

      const sensorDataEvent = new SensorDataEvent(
        this.socketClientService,
        data,
      );

      sensorDataEvent.emit(device.userId);

      this.logger.debug(`Emitted sensor data for device ${deviceId} to user ${device.userId}`);
    } catch (error) {
      this.logger.error(`Error handling sensor data: ${error.message}`);
    }
  }

  private async handleCalibrationStatus(payload: any) {
    try {
      const { deviceId, status, sensorType, message } = payload;

      if (!deviceId) {
        this.logger.warn('Received calibration status without deviceId');
        return;
      }

      const device = await this.deviceRepository.findByDeviceId(deviceId);

      if (!device || !device.userId) {
        this.logger.warn(`Device ${deviceId} not found or not paired`);
        return;
      }

      const calibrationEvent = new CalibrationStatusEvent(
        this.socketClientService,
        { status, sensorType },
        message,
      );

      calibrationEvent.emit(device.userId);

      this.logger.debug(`Emitted calibration status for device ${deviceId} to user ${device.userId}`);
    } catch (error) {
      this.logger.error(`Error handling calibration status: ${error.message}`);
    }
  }

  private async handleOffsetStatus(payload: any) {
    try {
      const { deviceId, sensorType, min, max } = payload;

      if (!deviceId) {
        this.logger.warn('Received offset status without deviceId');
        return;
      }

      const device = await this.deviceRepository.findByDeviceId(deviceId);

      if (!device || !device.userId) {
        this.logger.warn(`Device ${deviceId} not found or not paired`);
        return;
      }

      const offsetEvent = new OffsetStatusEvent(
        this.socketClientService,
        { sensorType, min, max },
        `Offset configuration updated for ${sensorType}`,
      );

      offsetEvent.emit(device.userId);

      this.logger.debug(`Emitted offset status for device ${deviceId} to user ${device.userId}`);
    } catch (error) {
      this.logger.error(`Error handling offset status: ${error.message}`);
    }
  }
} 