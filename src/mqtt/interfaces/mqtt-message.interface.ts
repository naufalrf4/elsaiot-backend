import { MessageType } from './mqtt-topic.interface';

/**
 * Interface for raw MQTT messages from the MQTT.js library
 */
export interface IMqttMessage {
  topic: string;
  payload: Buffer;
}

export interface MqttMessage {
  topic: string;
  payload: Buffer;
  messageType: MessageType;
  deviceCode: string;
}

export interface SensorDataPayload {
  timestamp?: string;
  ph: {
    raw: number;
    voltage?: number;
    calibrated?: number;
  };
  tds: {
    raw: number;
    voltage?: number;
    calibrated?: number;
  };
  do: {
    raw: number;
    voltage?: number;
    calibrated?: number;
  };
  temperature: {
    value: number;
    [key: string]: unknown;
  };
}

export enum SensorType {
  PH = 'ph',
  TDS = 'tds',
  DISSOLVED_OXYGEN = 'dissolved_oxygen',
  TEMPERATURE = 'temperature',
}

export enum CallbackStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum CalibrationAction {
  CALIBRATE = 'calibrate',
  RESET = 'reset',
}

export interface CallbackPayload {
  request_id?: string;
  sensor: SensorType;
  action: CalibrationAction;
  status: CallbackStatus;
  message?: string;
}

export interface CalibrationPayload {
  sensor: SensorType;
  payload: {
    m?: number;
    c?: number;
    coefficients?: number[];
    offset?: number;
  };
}

export interface OffsetPayload {
  sensor: SensorType;
  min: number;
  max: number;
}
