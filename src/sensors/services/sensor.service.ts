import { Injectable, Logger, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { SensorLogRepository } from '../repositories/sensor-log.repository';
import { DeviceService } from '../../devices/services/device.service';
import { 
  AggregatedSensorData, 
  AggregationType, 
  QueryParams, 
  Resolution,
  SensorDataPoint, 
  SensorStats, 
  TimeRange 
} from '../interfaces/sensor-data.interface';
import { TimeRangeDto, TimeRangePreset } from '../dto/time-range.dto';
import { SensorType } from '../../shared/enums/app.enum';

@Injectable()
export class SensorService {
  private readonly logger = new Logger(SensorService.name);

  constructor(
    private readonly sensorLogRepository: SensorLogRepository,
    private readonly deviceService: DeviceService,
  ) {}

  async getLatestReading(userId: string, deviceId: string): Promise<SensorDataPoint> {
    await this.validateDeviceOwnership(userId, deviceId);
    
    const latestData = await this.sensorLogRepository.getLatestDataByDeviceId(deviceId);
    
    if (!latestData) {
      throw new NotFoundException('No sensor data found for this device');
    }
    
    return latestData;
  }

  async getHistoricalData(
    userId: string,
    deviceId: string,
    timeRangeDto: TimeRangeDto,
    sensorTypes?: SensorType[],
    resolution?: Resolution,
    limit?: number
  ): Promise<SensorDataPoint[]> {
    await this.validateDeviceOwnership(userId, deviceId);
    
    const timeRange = this.parseTimeRange(timeRangeDto);
    
    if (!resolution) {
      resolution = this.selectResolution(timeRange);
    }
    
    const params: QueryParams = {
      deviceId,
      timeRange,
      resolution,
      sensorTypes,
      limit
    };
    
    return await this.sensorLogRepository.getHistoricalDataByDeviceId(params);
  }

  async getAggregatedData(
    userId: string,
    deviceId: string,
    timeRangeDto: TimeRangeDto,
    sensorTypes?: SensorType[],
    resolution?: Resolution,
    aggregation?: AggregationType,
    limit?: number
  ): Promise<AggregatedSensorData[]> {
    await this.validateDeviceOwnership(userId, deviceId);
    
    const timeRange = this.parseTimeRange(timeRangeDto);
    
    if (!resolution) {
      resolution = this.selectResolution(timeRange);
    }
    
    const params: QueryParams = {
      deviceId,
      timeRange,
      resolution,
      sensorTypes,
      aggregation,
      limit
    };
    
    return await this.sensorLogRepository.getAggregatedDataByDeviceId(params);
  }

  async getSensorStats(
    userId: string,
    deviceId: string,
    timeRangeDto: TimeRangeDto
  ): Promise<SensorStats[]> {
    await this.validateDeviceOwnership(userId, deviceId);
    
    const timeRange = this.parseTimeRange(timeRangeDto);
    
    return await this.sensorLogRepository.getSensorStatsByDeviceId(deviceId, timeRange);
  }
  
  private parseTimeRange(timeRangeDto: TimeRangeDto): TimeRange {
    const now = new Date();
    
    if (timeRangeDto.from && timeRangeDto.to) {
      return {
        from: timeRangeDto.from,
        to: timeRangeDto.to
      };
    }
    
    if (timeRangeDto.preset) {
      const from = new Date(now);
      
      switch (timeRangeDto.preset) {
        case TimeRangePreset.LAST_HOUR:
          from.setHours(from.getHours() - 1);
          break;
        case TimeRangePreset.LAST_DAY:
          from.setDate(from.getDate() - 1);
          break;
        case TimeRangePreset.LAST_WEEK:
          from.setDate(from.getDate() - 7);
          break;
        case TimeRangePreset.LAST_MONTH:
          from.setMonth(from.getMonth() - 1);
          break;
      }
      
      return {
        from,
        to: now
      };
    }
    
    if (timeRangeDto.range) {
      const [fromStr, toStr] = timeRangeDto.range.split('|');
      
      if (fromStr && toStr) {
        const from = new Date(fromStr);
        const to = new Date(toStr);
        
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          return { from, to };
        }
      }
    }
    
    const from = new Date(now);
    from.setDate(from.getDate() - 1);
    
    return {
      from,
      to: now
    };
  }
  
  private selectResolution(timeRange: TimeRange): Resolution {
    const rangeDuration = timeRange.to.getTime() - timeRange.from.getTime();
    const hourInMs = 60 * 60 * 1000;
    const dayInMs = 24 * hourInMs;
    const weekInMs = 7 * dayInMs;
    
    if (rangeDuration <= hourInMs) {
      return Resolution.RAW;
    } else if (rangeDuration <= dayInMs) {
      return Resolution.MINUTE;
    } else if (rangeDuration <= weekInMs) {
      return Resolution.HOURLY;
    } else {
      return Resolution.DAILY;
    }
  }
  
  private async validateDeviceOwnership(userId: string, deviceId: string): Promise<void> {
    try {
      await this.deviceService.findDeviceById(deviceId, userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Device not found');
      } else if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        this.logger.warn(`User ${userId} attempted to access device ${deviceId} which they don't own`);
        throw new UnauthorizedException('You do not have permission to access this device');
      }
      throw error;
    }
  }
} 