import { SensorType } from '../../shared/enums/app.enum';
import { SensorDataPoint, SensorStats, AggregatedSensorData } from '../interfaces/sensor-data.interface';

export class SensorReadingDto {
  timestamp: Date;
  ph?: number;
  temperature?: number;
  tds?: number;
  dissolvedOxygen?: number;
}

export class HistoricalDataResponseDto {
  deviceId: string;
  timeRange: {
    from: Date;
    to: Date;
  };
  resolution: string;
  data: SensorDataPoint[];
}

export class AggregatedDataResponseDto {
  deviceId: string;
  timeRange: {
    from: Date;
    to: Date;
  };
  sensorType: SensorType;
  aggregation: string;
  data: AggregatedSensorData[];
}

export class SensorStatsResponseDto {
  deviceId: string;
  timeRange: {
    from: Date;
    to: Date;
  };
  stats: SensorStats[];
} 