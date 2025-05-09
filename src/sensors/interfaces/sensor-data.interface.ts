import { SensorType } from '../../shared/enums/app.enum';

export interface TimeRange {
  from: Date;
  to: Date;
}

export enum Resolution {
  RAW = 'raw',
  MINUTE = 'minute',
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export enum AggregationType {
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  SUM = 'sum',
  COUNT = 'count',
}

export interface SensorDataPoint {
  timestamp: Date;
  ph?: number;
  temperature?: number;
  tds?: number;
  dissolvedOxygen?: number;
}

export interface AggregatedSensorData {
  timestamp: Date;
  sensorType: SensorType;
  min: number;
  max: number;
  avg: number;
}

export interface SensorStats {
  sensorType: SensorType;
  currentValue: number;
  minValue: number;
  maxValue: number;
  avgValue: number;
  lastUpdated: Date;
  trend: 'rising' | 'falling' | 'stable';
}

export interface QueryParams {
  deviceId: string;
  timeRange: TimeRange;
  resolution?: Resolution;
  aggregation?: AggregationType;
  sensorTypes?: SensorType[];
  limit?: number;
} 