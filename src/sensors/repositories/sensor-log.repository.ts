import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SensorLog } from '../entities/sensor-log.entity';
import {
  AggregatedSensorData,
  AggregationType,
  QueryParams,
  Resolution,
  SensorDataPoint,
  SensorStats,
  TimeRange,
} from '../interfaces/sensor-data.interface';
import { SensorType } from '../../shared/enums/app.enum';

export interface SensorData {
  deviceId: string;
  timestamp: Date;
  ph: number;
  tds: number;
  dissolvedOxygen: number;
  temperature: number;
}

@Injectable()
export class SensorLogRepository {
  private readonly logger = new Logger(SensorLogRepository.name);

  constructor(
    @InjectRepository(SensorLog)
    private readonly repository: Repository<SensorLog>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async storeSensorData(data: SensorData): Promise<void> {
    try {
      const sensorLog = new SensorLog();
      sensorLog.deviceId = data.deviceId;
      sensorLog.timestamp = data.timestamp;
      sensorLog.ph = data.ph;
      sensorLog.temperature = data.temperature;
      sensorLog.tds = data.tds;
      sensorLog.dissolvedOxygen = data.dissolvedOxygen;

      await this.repository.save(sensorLog);
    } catch (error) {
      this.logger.error(
        `Failed to store sensor data: ${error.message}`,
        error.stack,
      );
      await this.storeSensorDataWithRawSql(data);
    }
  }

  async getLatestDataByDeviceId(
    deviceId: string,
  ): Promise<SensorDataPoint | null> {
    try {
      const query = `
        SELECT 
          timestamp, ph, temperature, tds, "dissolvedOxygen"
        FROM sensor_logs 
        WHERE "deviceId" = $1
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const result = await this.dataSource.query(query, [deviceId]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(
        `Failed to get latest sensor data: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getHistoricalDataByDeviceId(
    params: QueryParams,
  ): Promise<SensorDataPoint[]> {
    try {
      const {
        deviceId,
        timeRange,
        resolution = Resolution.RAW,
        limit = 100,
      } = params;

      let query: string;
      const queryParams = [deviceId, timeRange.from, timeRange.to, limit];

      switch (resolution) {
        case Resolution.MINUTE:
          query = `
            SELECT 
              time_bucket('1 minute', timestamp) as timestamp,
              AVG(ph) as ph,
              AVG(temperature) as temperature,
              AVG(tds) as tds,
              AVG("dissolvedOxygen") as "dissolvedOxygen"
            FROM sensor_logs
            WHERE 
              "deviceId" = $1 AND
              timestamp >= $2 AND
              timestamp <= $3
            GROUP BY timestamp
            ORDER BY timestamp DESC
            LIMIT $4
          `;
          break;

        case Resolution.HOURLY:
          query = `
            SELECT 
              time_bucket('1 hour', timestamp) as timestamp,
              AVG(ph) as ph,
              AVG(temperature) as temperature,
              AVG(tds) as tds,
              AVG("dissolvedOxygen") as "dissolvedOxygen"
            FROM sensor_logs
            WHERE 
              "deviceId" = $1 AND
              timestamp >= $2 AND
              timestamp <= $3
            GROUP BY timestamp
            ORDER BY timestamp DESC
            LIMIT $4
          `;
          break;

        case Resolution.DAILY:
          query = `
            SELECT 
              time_bucket('1 day', timestamp) as timestamp,
              AVG(ph) as ph,
              AVG(temperature) as temperature,
              AVG(tds) as tds,
              AVG("dissolvedOxygen") as "dissolvedOxygen"
            FROM sensor_logs
            WHERE 
              "deviceId" = $1 AND
              timestamp >= $2 AND
              timestamp <= $3
            GROUP BY timestamp
            ORDER BY timestamp DESC
            LIMIT $4
          `;
          break;

        default:
          query = `
            SELECT 
              timestamp,
              ph,
              temperature,
              tds,
              "dissolvedOxygen"
            FROM sensor_logs
            WHERE 
              "deviceId" = $1 AND
              timestamp >= $2 AND
              timestamp <= $3
            ORDER BY timestamp DESC
            LIMIT $4
          `;
      }

      return await this.dataSource.query(query, queryParams);
    } catch (error) {
      this.logger.error(
        `Failed to get historical sensor data: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAggregatedDataByDeviceId(
    params: QueryParams,
  ): Promise<AggregatedSensorData[]> {
    try {
      const {
        deviceId,
        timeRange,
        resolution = Resolution.HOURLY,
        sensorTypes = Object.values(SensorType),
        aggregation = AggregationType.AVG,
        limit = 100,
      } = params;

      const sensorColumns = [];

      interface SensorTypeParam {
        column: string;
        sensorType: SensorType;
      }

      const sensorTypeParams: SensorTypeParam[] = [];

      for (const sensorType of sensorTypes) {
        let column;
        switch (sensorType) {
          case SensorType.PH:
            column = 'ph';
            break;
          case SensorType.TEMPERATURE:
            column = 'temperature';
            break;
          case SensorType.TDS:
            column = 'tds';
            break;
          case SensorType.DISSOLVED_OXYGEN:
            column = '"dissolvedOxygen"';
            break;
        }

        if (column) {
          sensorTypeParams.push({
            column,
            sensorType,
          });
        }
      }

      const results: AggregatedSensorData[] = [];

      for (const { column, sensorType } of sensorTypeParams) {
        let timeBucket;
        switch (resolution) {
          case Resolution.MINUTE:
            timeBucket = '1 minute';
            break;
          case Resolution.HOURLY:
            timeBucket = '1 hour';
            break;
          case Resolution.DAILY:
            timeBucket = '1 day';
            break;
          default:
            timeBucket = '1 hour';
        }

        const query = `
          SELECT 
            time_bucket('${timeBucket}', timestamp) as timestamp,
            MIN(${column}) as min,
            MAX(${column}) as max,
            AVG(${column}) as avg
          FROM sensor_logs
          WHERE 
            "deviceId" = $1 AND
            timestamp >= $2 AND
            timestamp <= $3 AND
            ${column} IS NOT NULL
          GROUP BY timestamp
          ORDER BY timestamp DESC
          LIMIT $4
        `;

        const queryParams = [deviceId, timeRange.from, timeRange.to, limit];
        const data = await this.dataSource.query(query, queryParams);

        const mappedData = data.map((item) => ({
          ...item,
          sensorType,
        }));

        results.push(...mappedData);
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to get aggregated sensor data: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getSensorStatsByDeviceId(
    deviceId: string,
    timeRange: TimeRange,
  ): Promise<SensorStats[]> {
    try {
      const query = `
        WITH sensor_data AS (
          SELECT
            MIN(ph) as ph_min,
            MAX(ph) as ph_max,
            AVG(ph) as ph_avg,
            MIN(temperature) as temp_min,
            MAX(temperature) as temp_max,
            AVG(temperature) as temp_avg,
            MIN(tds) as tds_min,
            MAX(tds) as tds_max,
            AVG(tds) as tds_avg,
            MIN("dissolvedOxygen") as do_min,
            MAX("dissolvedOxygen") as do_max,
            AVG("dissolvedOxygen") as do_avg
          FROM sensor_logs
          WHERE 
            "deviceId" = $1 AND
            timestamp >= $2 AND
            timestamp <= $3
        ),
        latest_data AS (
          SELECT 
            ph, temperature, tds, "dissolvedOxygen" as do,
            timestamp as last_updated
          FROM sensor_logs
          WHERE "deviceId" = $1
          ORDER BY timestamp DESC
          LIMIT 1
        ),
        trend_data AS (
          SELECT
            CASE WHEN
              (SELECT ph FROM latest_data) >
              (SELECT ph_avg FROM sensor_data)
              THEN 'rising'
              WHEN
              (SELECT ph FROM latest_data) <
              (SELECT ph_avg FROM sensor_data)
              THEN 'falling'
              ELSE 'stable'
            END as ph_trend,
            CASE WHEN
              (SELECT temperature FROM latest_data) >
              (SELECT temp_avg FROM sensor_data)
              THEN 'rising'
              WHEN
              (SELECT temperature FROM latest_data) <
              (SELECT temp_avg FROM sensor_data)
              THEN 'falling'
              ELSE 'stable'
            END as temp_trend,
            CASE WHEN
              (SELECT tds FROM latest_data) >
              (SELECT tds_avg FROM sensor_data)
              THEN 'rising'
              WHEN
              (SELECT tds FROM latest_data) <
              (SELECT tds_avg FROM sensor_data)
              THEN 'falling'
              ELSE 'stable'
            END as tds_trend,
            CASE WHEN
              (SELECT do FROM latest_data) >
              (SELECT do_avg FROM sensor_data)
              THEN 'rising'
              WHEN
              (SELECT do FROM latest_data) <
              (SELECT do_avg FROM sensor_data)
              THEN 'falling'
              ELSE 'stable'
            END as do_trend
        )
        SELECT 
          'ph' as "sensorType",
          (SELECT ph FROM latest_data) as "currentValue",
          (SELECT ph_min FROM sensor_data) as "minValue",
          (SELECT ph_max FROM sensor_data) as "maxValue",
          (SELECT ph_avg FROM sensor_data) as "avgValue",
          (SELECT last_updated FROM latest_data) as "lastUpdated",
          (SELECT ph_trend FROM trend_data) as "trend"
        UNION ALL
        SELECT 
          'temperature' as "sensorType",
          (SELECT temperature FROM latest_data) as "currentValue",
          (SELECT temp_min FROM sensor_data) as "minValue",
          (SELECT temp_max FROM sensor_data) as "maxValue",
          (SELECT temp_avg FROM sensor_data) as "avgValue",
          (SELECT last_updated FROM latest_data) as "lastUpdated",
          (SELECT temp_trend FROM trend_data) as "trend"
        UNION ALL
        SELECT 
          'tds' as "sensorType",
          (SELECT tds FROM latest_data) as "currentValue",
          (SELECT tds_min FROM sensor_data) as "minValue",
          (SELECT tds_max FROM sensor_data) as "maxValue",
          (SELECT tds_avg FROM sensor_data) as "avgValue",
          (SELECT last_updated FROM latest_data) as "lastUpdated",
          (SELECT tds_trend FROM trend_data) as "trend"
        UNION ALL
        SELECT 
          'dissolved_oxygen' as "sensorType",
          (SELECT do FROM latest_data) as "currentValue",
          (SELECT do_min FROM sensor_data) as "minValue",
          (SELECT do_max FROM sensor_data) as "maxValue",
          (SELECT do_avg FROM sensor_data) as "avgValue",
          (SELECT last_updated FROM latest_data) as "lastUpdated",
          (SELECT do_trend FROM trend_data) as "trend"
      `;

      const results: SensorStats[] = await this.dataSource.query(query, [
        deviceId,
        timeRange.from,
        timeRange.to,
      ]);
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to get sensor stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async storeSensorDataWithRawSql(data: SensorData): Promise<void> {
    try {
      const query = `
        INSERT INTO sensor_logs 
        ("deviceId", timestamp, ph, temperature, tds, "dissolvedOxygen")
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await this.dataSource.query(query, [
        data.deviceId,
        data.timestamp,
        data.ph,
        data.temperature,
        data.tds,
        data.dissolvedOxygen,
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to store sensor data with raw SQL: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
