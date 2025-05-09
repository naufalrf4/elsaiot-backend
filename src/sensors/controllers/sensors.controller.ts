import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SensorService } from '../services/sensor.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { TimeRangeDto } from '../dto/time-range.dto';
import { SensorFilterDto } from '../dto/sensor-filter.dto';
import {
  AggregatedDataResponseDto,
  HistoricalDataResponseDto,
  SensorStatsResponseDto,
} from '../dto/sensor-response.dto';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SensorType } from '../../shared/enums/app.enum';

@ApiTags('sensors')
@Controller('sensors')
@UseGuards(JwtAuthGuard)
export class SensorsController {
  constructor(private readonly sensorService: SensorService) {}

  @Get('devices/:deviceId/latest')
  @ApiOperation({ summary: 'Get latest sensor readings for a device' })
  @ApiParam({
    name: 'deviceId',
    description: 'The unique identifier of the device',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the latest sensor readings',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Latest sensor data retrieved successfully',
        },
        data: { type: 'object' },
        meta: { type: 'object' },
      },
    },
  })
  async getLatestReading(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    const data = await this.sensorService.getLatestReading(userId, deviceId);

    return {
      status: true,
      message: 'Latest sensor data retrieved successfully',
      data,
      meta: {
        timestamp: new Date(),
      },
    };
  }

  @Get('devices/:deviceId/historical')
  @ApiOperation({
    summary: 'Get historical sensor data with time-based filtering',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'The unique identifier of the device',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start timestamp (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End timestamp (ISO 8601)',
  })
  @ApiQuery({
    name: 'preset',
    required: false,
    description:
      'Time range preset (last_hour, last_day, last_week, last_month)',
  })
  @ApiQuery({
    name: 'resolution',
    required: false,
    description: 'Data resolution (raw, minute, hourly, daily)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of data points to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns historical sensor data',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Historical sensor data retrieved successfully',
        },
        data: { type: 'object' },
        meta: { type: 'object' },
      },
    },
  })
  async getHistoricalData(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
    @Query() timeRangeDto: TimeRangeDto,
    @Query() sensorFilterDto: SensorFilterDto,
  ) {
    const data = await this.sensorService.getHistoricalData(
      userId,
      deviceId,
      timeRangeDto,
      sensorFilterDto.sensorTypes,
      sensorFilterDto.resolution,
      sensorFilterDto.limit,
    );

    const timeRange = this.sensorService['parseTimeRange'](timeRangeDto);

    const response: HistoricalDataResponseDto = {
      deviceId,
      timeRange,
      resolution:
        sensorFilterDto.resolution ||
        this.sensorService['selectResolution'](timeRange),
      data,
    };

    return {
      status: true,
      message: 'Historical sensor data retrieved successfully',
      data: response,
      meta: {
        count: data.length,
        timestamp: new Date(),
      },
    };
  }

  @Get('devices/:deviceId/aggregated')
  @ApiOperation({ summary: 'Get aggregated sensor data for analytics' })
  @ApiParam({
    name: 'deviceId',
    description: 'The unique identifier of the device',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start timestamp (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End timestamp (ISO 8601)',
  })
  @ApiQuery({
    name: 'preset',
    required: false,
    description:
      'Time range preset (last_hour, last_day, last_week, last_month)',
  })
  @ApiQuery({
    name: 'sensorTypes',
    required: false,
    description: 'Comma-separated sensor types to include',
  })
  @ApiQuery({
    name: 'resolution',
    required: false,
    description: 'Data resolution (minute, hourly, daily)',
  })
  @ApiQuery({
    name: 'aggregation',
    required: false,
    description: 'Aggregation type (avg, min, max, sum, count)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of data points to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns aggregated sensor data',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Aggregated sensor data retrieved successfully',
        },
        data: { type: 'object' },
        meta: { type: 'object' },
      },
    },
  })
  async getAggregatedData(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
    @Query() timeRangeDto: TimeRangeDto,
    @Query() sensorFilterDto: SensorFilterDto,
  ) {
    const data = await this.sensorService.getAggregatedData(
      userId,
      deviceId,
      timeRangeDto,
      sensorFilterDto.sensorTypes,
      sensorFilterDto.resolution,
      sensorFilterDto.aggregation,
      sensorFilterDto.limit,
    );

    const timeRange = this.sensorService['parseTimeRange'](timeRangeDto);

    const response: AggregatedDataResponseDto = {
      deviceId,
      timeRange,
      sensorType: sensorFilterDto.sensorTypes?.[0] || SensorType.TEMPERATURE,
      aggregation: sensorFilterDto.aggregation || 'avg',
      data,
    };

    return {
      status: true,
      message: 'Aggregated sensor data retrieved successfully',
      data: response,
      meta: {
        count: data.length,
        timestamp: new Date(),
      },
    };
  }

  @Get('devices/:deviceId/stats')
  @ApiOperation({ summary: 'Get statistical summaries for sensor data' })
  @ApiParam({
    name: 'deviceId',
    description: 'The unique identifier of the device',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start timestamp (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End timestamp (ISO 8601)',
  })
  @ApiQuery({
    name: 'preset',
    required: false,
    description:
      'Time range preset (last_hour, last_day, last_week, last_month)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns statistical summaries for sensor data',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Sensor stats retrieved successfully',
        },
        data: { type: 'object' },
        meta: { type: 'object' },
      },
    },
  })
  async getSensorStats(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
    @Query() timeRangeDto: TimeRangeDto,
  ) {
    const stats = await this.sensorService.getSensorStats(
      userId,
      deviceId,
      timeRangeDto,
    );

    const timeRange = this.sensorService['parseTimeRange'](timeRangeDto);

    const response: SensorStatsResponseDto = {
      deviceId,
      timeRange,
      stats,
    };

    return {
      status: true,
      message: 'Sensor stats retrieved successfully',
      data: response,
      meta: {
        timestamp: new Date(),
      },
    };
  }
}
