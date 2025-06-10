import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeviceRepository } from '../../devices/repositories/device.repository';
import { CalibrationStatusEvent } from '../events/calibration-status.event';
import { OffsetStatusEvent } from '../events/offset-status.event';
import { SensorDataEvent } from '../events/sensor-data.event';
import { SocketClientService } from '../services/socket-client.service';
import { Device } from 'src/devices/entities/device.entity';

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
    // Payload may contain:
    //  - deviceId   -> database UUID (added by DataHandler)
    //  - device_id  -> original deviceCode from MQTT script
    //  - deviceCode -> (future-proof) explicit device code key
    const { deviceId: dbId, device_id: codeSnake, deviceCode: codeCamel, ...sensorData } = payload;

    const deviceIdentifier = dbId || codeSnake || codeCamel;
    if (!deviceIdentifier) {
      this.logger.warn('Sensor data payload missing device identifier (deviceId / device_id / deviceCode)');
      return;
    }

    try {
      let device: Device | null = null; // Explicitly type 'device'

      if (dbId) {
        device = await this.deviceRepository.findByDeviceId(dbId);
      }

      // If not found by dbId, or if dbId was not provided, try by deviceCode
      if (!device) { // Check if device is still null
        const deviceCodeToLookup = codeSnake || codeCamel;
        if (deviceCodeToLookup) {
          device = await this.deviceRepository.findByDeviceCode(deviceCodeToLookup);
        }
      }

      this.logger.debug(`Device lookup result for identifier ${deviceIdentifier}: ${JSON.stringify(device)}`);

      // At this point, if device is still null, it means it wasn't found by any identifier.
      if (!device) {
        this.logger.warn(`Device ${deviceIdentifier} not found in database.`);
        return;
      }

      // Now, TypeScript knows 'device' is of type 'Device' because of the '!device' check and return above.
      // So, device.userId and device.id are safe to access.
      if (!device.userId) {
        this.logger.warn(`Device ${deviceIdentifier} (ID: ${device.id}) has no associated user.`);
        return;
      }

      const eventPayload = {
        ...sensorData,
        deviceId: device.id,
      };

      const event = new SensorDataEvent(this.socketClientService, eventPayload);
      event.emit(device.userId);

      this.logger.debug(`Sensor data emitted for device ${device.id} to user ${device.userId}`);
    } catch (error) {
      this.logger.error(`Sensor data handling failed for identifier ${deviceIdentifier}: ${error.message}`, error.stack);
    }
  }

  private async handleCalibrationStatus(payload: any) {
    const { deviceId, status, sensorType, message } = payload;
    if (!deviceId) return this.logger.warn('Missing deviceId in calibration payload');

    try {
      const device = await this.deviceRepository.findByDeviceId(deviceId);
      if (!device || !device.userId) {
        return this.logger.warn(`Invalid or unpaired device: ${deviceId}`);
      }

      const event = new CalibrationStatusEvent(this.socketClientService, { status, sensorType }, message);
      event.emit(device.userId);

      this.logger.debug(`Calibration status emitted for device ${deviceId} to user ${device.userId}`);
    } catch (error) {
      this.logger.error(`Calibration status handling failed: ${error.message}`);
    }
  }

  private async handleOffsetStatus(payload: any) {
    const { deviceId, sensorType, min, max } = payload;
    if (!deviceId) return this.logger.warn('Missing deviceId in offset payload');

    try {
      const device = await this.deviceRepository.findByDeviceId(deviceId);
      if (!device || !device.userId) {
        return this.logger.warn(`Invalid or unpaired device: ${deviceId}`);
      }

      const event = new OffsetStatusEvent(
        this.socketClientService,
        { sensorType, min, max },
        `Offset updated for ${sensorType}`,
      );
      event.emit(device.userId);

      this.logger.debug(`Offset status emitted for device ${deviceId} to user ${device.userId}`);
    } catch (error) {
      this.logger.error(`Offset status handling failed: ${error.message}`);
    }
  }
}
