import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SensorLog } from '../entities/sensor-log.entity';

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

  /**
   * Store sensor data in the TimescaleDB
   * Using TypeORM repository for simpler operations
   */
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
      // Try once more with direct SQL in case of TypeORM issues
      await this.storeSensorDataWithRawSql(data);
    }
  }

  /**
   * Fallback method to store sensor data using raw SQL
   * More efficient for bulk inserts and bypasses TypeORM overhead
   */
  private async storeSensorDataWithRawSql(data: SensorData): Promise<void> {
    try {
      const query = `
        INSERT INTO sensor_logs 
        (device_id, timestamp, ph, temperature, tds, dissolved_oxygen)
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
      throw error; // Re-throw after logging
    }
  }
}
