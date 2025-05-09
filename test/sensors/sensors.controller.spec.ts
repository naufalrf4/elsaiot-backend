import { Test, TestingModule } from '@nestjs/testing';
import { SensorsController } from '../../src/sensors/controllers/sensors.controller';
import { SensorService } from '../../src/sensors/services/sensor.service';
import { TimeRangeDto, TimeRangePreset } from '../../src/sensors/dto/time-range.dto';
import { SensorFilterDto } from '../../src/sensors/dto/sensor-filter.dto';
import { Resolution } from '../../src/sensors/interfaces/sensor-data.interface';
import { SensorType } from '../../src/shared/enums/app.enum';
import { ValidationPipe } from '@nestjs/common';

describe('SensorsController', () => {
  let controller: SensorsController;
  let sensorService: SensorService;

  const mockSensorService = {
    getLatestReading: jest.fn(),
    getHistoricalData: jest.fn(),
    getAggregatedData: jest.fn(),
    getSensorStats: jest.fn(),
    ['parseTimeRange']: jest.fn(),
    ['selectResolution']: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SensorsController],
      providers: [
        {
          provide: SensorService,
          useValue: mockSensorService,
        },
      ],
    }).compile();

    controller = module.get<SensorsController>(SensorsController);
    sensorService = module.get<SensorService>(SensorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLatestReading', () => {
    it('should return the latest sensor reading', async () => {
      const userId = 'user-id';
      const deviceId = 'device-id';
      const mockSensorData = {
        timestamp: new Date(),
        ph: 7.0,
        temperature: 25.5,
        tds: 350,
        dissolvedOxygen: 6.8,
      };

      mockSensorService.getLatestReading.mockResolvedValue(mockSensorData);

      const result = await controller.getLatestReading(userId, deviceId);

      expect(mockSensorService.getLatestReading).toHaveBeenCalledWith(userId, deviceId);
      expect(result).toEqual({
        status: true,
        message: 'Latest sensor data retrieved successfully',
        data: mockSensorData,
        meta: expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      });
    });
  });

  describe('getHistoricalData', () => {
    it('should return historical sensor data', async () => {
      const userId = 'user-id';
      const deviceId = 'device-id';
      const timeRangeDto = new TimeRangeDto();
      timeRangeDto.preset = TimeRangePreset.LAST_DAY;
      
      const sensorFilterDto = new SensorFilterDto();
      sensorFilterDto.resolution = Resolution.HOURLY;
      
      const mockHistoricalData = [
        {
          timestamp: new Date('2023-05-01T00:00:00Z'),
          ph: 7.0,
          temperature: 25.5,
          tds: 350,
          dissolvedOxygen: 6.8,
        },
        {
          timestamp: new Date('2023-05-01T01:00:00Z'),
          ph: 7.1,
          temperature: 25.6,
          tds: 355,
          dissolvedOxygen: 6.7,
        },
      ];

      const mockTimeRange = {
        from: new Date('2023-05-01T00:00:00Z'),
        to: new Date('2023-05-02T00:00:00Z'),
      };

      mockSensorService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockSensorService['parseTimeRange'].mockReturnValue(mockTimeRange);
      mockSensorService['selectResolution'].mockReturnValue(Resolution.HOURLY);

      const result = await controller.getHistoricalData(userId, deviceId, timeRangeDto, sensorFilterDto);

      expect(mockSensorService.getHistoricalData).toHaveBeenCalledWith(
        userId,
        deviceId,
        timeRangeDto,
        sensorFilterDto.sensorTypes,
        sensorFilterDto.resolution,
        sensorFilterDto.limit,
      );
      
      expect(result).toEqual({
        status: true,
        message: 'Historical sensor data retrieved successfully',
        data: {
          deviceId,
          timeRange: mockTimeRange,
          resolution: Resolution.HOURLY,
          data: mockHistoricalData,
        },
        meta: expect.objectContaining({
          count: mockHistoricalData.length,
          timestamp: expect.any(Date),
        }),
      });
    });
  });

  describe('getAggregatedData', () => {
    it('should return aggregated sensor data', async () => {
      const userId = 'user-id';
      const deviceId = 'device-id';
      const timeRangeDto = new TimeRangeDto();
      timeRangeDto.preset = TimeRangePreset.LAST_WEEK;
      
      const sensorFilterDto = new SensorFilterDto();
      sensorFilterDto.sensorTypes = [SensorType.PH];
      sensorFilterDto.resolution = Resolution.DAILY;
      
      const mockAggregatedData = [
        {
          timestamp: new Date('2023-05-01T00:00:00Z'),
          sensorType: SensorType.PH,
          min: 6.8,
          max: 7.2,
          avg: 7.0,
        },
        {
          timestamp: new Date('2023-05-02T00:00:00Z'),
          sensorType: SensorType.PH,
          min: 6.9,
          max: 7.3,
          avg: 7.1,
        },
      ];

      const mockTimeRange = {
        from: new Date('2023-05-01T00:00:00Z'),
        to: new Date('2023-05-08T00:00:00Z'),
      };

      mockSensorService.getAggregatedData.mockResolvedValue(mockAggregatedData);
      mockSensorService['parseTimeRange'].mockReturnValue(mockTimeRange);

      const result = await controller.getAggregatedData(userId, deviceId, timeRangeDto, sensorFilterDto);

      expect(mockSensorService.getAggregatedData).toHaveBeenCalledWith(
        userId,
        deviceId,
        timeRangeDto,
        sensorFilterDto.sensorTypes,
        sensorFilterDto.resolution,
        sensorFilterDto.aggregation,
        sensorFilterDto.limit,
      );
      
      expect(result).toEqual({
        status: true,
        message: 'Aggregated sensor data retrieved successfully',
        data: {
          deviceId,
          timeRange: mockTimeRange,
          sensorType: SensorType.PH,
          aggregation: 'avg',
          data: mockAggregatedData,
        },
        meta: expect.objectContaining({
          count: mockAggregatedData.length,
          timestamp: expect.any(Date),
        }),
      });
    });
  });

  describe('getSensorStats', () => {
    it('should return sensor stats', async () => {
      const userId = 'user-id';
      const deviceId = 'device-id';
      const timeRangeDto = new TimeRangeDto();
      timeRangeDto.preset = TimeRangePreset.LAST_DAY;
      
      const mockSensorStats = [
        {
          sensorType: SensorType.PH,
          currentValue: 7.1,
          minValue: 6.9,
          maxValue: 7.3,
          avgValue: 7.1,
          lastUpdated: new Date('2023-05-02T12:00:00Z'),
          trend: 'stable',
        },
        {
          sensorType: SensorType.TEMPERATURE,
          currentValue: 25.8,
          minValue: 25.2,
          maxValue: 26.0,
          avgValue: 25.6,
          lastUpdated: new Date('2023-05-02T12:00:00Z'),
          trend: 'rising',
        },
      ];

      const mockTimeRange = {
        from: new Date('2023-05-01T00:00:00Z'),
        to: new Date('2023-05-02T00:00:00Z'),
      };

      mockSensorService.getSensorStats.mockResolvedValue(mockSensorStats);
      mockSensorService['parseTimeRange'].mockReturnValue(mockTimeRange);

      const result = await controller.getSensorStats(userId, deviceId, timeRangeDto);

      expect(mockSensorService.getSensorStats).toHaveBeenCalledWith(
        userId,
        deviceId,
        timeRangeDto,
      );
      
      expect(result).toEqual({
        status: true,
        message: 'Sensor stats retrieved successfully',
        data: {
          deviceId,
          timeRange: mockTimeRange,
          stats: mockSensorStats,
        },
        meta: expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      });
    });
  });
}); 