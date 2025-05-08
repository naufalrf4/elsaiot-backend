import { MqttClient } from 'mqtt/*';
import { CalibrationPayload, OffsetPayload } from './mqtt-message.interface';

export interface IMqttClientService {
  /**
   * Connect to the MQTT broker using configuration
   */
  connect(): Promise<void>;

  /**
   * Gets the MQTT client instance
   */
  getClient(): MqttClient;

  /**
   * Subscribe to MQTT topics
   * @param topics - Array of topics to subscribe to
   */
  subscribe(topics: string[]): Promise<void>;

  /**
   * Publish message to a topic
   * @param topic - Topic to publish to
   * @param message - Message to publish
   */
  publish(topic: string, message: string | Buffer): Promise<void>;

  /**
   * Send a calibration command to a device
   * @param deviceCode - Target device code
   * @param payload - Calibration data
   */
  sendCalibration(
    deviceCode: string,
    payload: CalibrationPayload,
  ): Promise<void>;

  /**
   * Send offset configuration to a device
   * @param deviceCode - Target device code
   * @param payload - Offset configuration data
   */
  sendOffset(deviceCode: string, payload: OffsetPayload): Promise<void>;

  /**
   * Disconnect from the MQTT broker
   */
  disconnect(): Promise<void>;
}
