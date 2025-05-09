import { Test, TestingModule } from '@nestjs/testing';
import { SensorService } from '../../src/sensors/services/sensor.service';
import { SensorLogRepository } from '../../src/sensors/repositories/sensor-log.repository';
import { DeviceService } from '../../src/devices/services/device.service';
import { NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { SensorType } from '../../src/shared/enums/app.enum';
import { TimeRangeDto, TimeRangePreset } from '../../src/sensors/dto/time-range.dto';
import { Resolution } from '../../src/sensors/interfaces/sensor-data.interface';

describe('SensorService', () => {
  let service: SensorService;
  let sensorLogRepository: SensorLogRepository;
  let deviceService: DeviceService;

  const mockSensorLogRepository = {
    getLatestDataByDeviceId: jest.fn(),
    getHistoricalDataByDeviceId: jest.fn(),
    getAggregatedDataByDeviceId: jest.fn(),
    getSensorStatsByDeviceId: jest.fn(),
  };

  const mockDeviceService = {
    findDeviceById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorService,
        {
          provide: SensorLogRepository,
          useValue: mockSensorLogRepository,
        },
        {
          provide: DeviceService,
          useValue: mockDeviceService,
        },
      ],
    }).compile();

    service = module.get<SensorService>(SensorService);
    sensorLogRepository = module.get<SensorLogRepository>(SensorLogRepository);
    deviceService = module.get<DeviceService>(DeviceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLatestReading', () => {
    const userId = 'user-id';
    const deviceId = 'device-id';
    const mockSensorData = {
      timestamp: new Date(),
      ph: 7.0,
      temperature: 25.5,
      tds: 350,
      dissolvedOxygen: 6.8,
    };

    it('should return latest sensor data for a device', async () => {
      mockDeviceService.findDeviceById.mockResolvedValue({ id: deviceId, userId });
      mockSensorLogRepository.getLatestDataByDeviceId.mockResolvedValue(mockSensorData);

      const result = await service.getLatestReading(userId, deviceId);
      
      expect(mockDeviceService.findDeviceById).toHaveBeenCalledWith(deviceId, userId);
      expect(mockSensorLogRepository.getLatestDataByDeviceId).toHaveBeenCalledWith(deviceId);
      expect(result).toEqual(mockSensorData);
    });

    it('should throw NotFoundException if no data is found', async () => {
      mockDeviceService.findDeviceById.mockResolvedValue({ id: deviceId, userId });
      mockSensorLogRepository.getLatestDataByDeviceId.mockResolvedValue(null);

      await expect(service.getLatestReading(userId, deviceId)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user does not own device', async () => {
      mockDeviceService.findDeviceById.mockRejectedValue(new ForbiddenException());

      await expect(service.getLatestReading(userId, deviceId)).rejects.toThrow(UnauthorizedException);
      expect(mockSensorLogRepository.getLatestDataByDeviceId).not.toHaveBeenCalled();
    });
  });

  describe('getHistoricalData', () => {
    const userId = 'user-id';
    const deviceId = 'device-id';
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

    it('should return historical data with default params', async () => {
      mockDeviceService.findDeviceById.mockResolvedValue({ id: deviceId, userId });
      mockSensorLogRepository.getHistoricalDataByDeviceId.mockResolvedValue(mockHistoricalData);

      const timeRangeDto = new TimeRangeDto();
      timeRangeDto.preset = TimeRangePreset.LAST_DAY;

      const result = await service.getHistoricalData(userId, deviceId, timeRangeDto);
      
      expect(mockDeviceService.findDeviceById).toHaveBeenCalledWith(deviceId, userId);
      expect(mockSensorLogRepository.getHistoricalDataByDeviceId).toHaveBeenCalled();
      expect(result).toEqual(mockHistoricalData);
    });

    it('should use custom resolution when provided', async () => {
      mockDeviceService.findDeviceById.mockResolvedValue({ id: deviceId, userId });
      mockSensorLogRepository.getHistoricalDataByDeviceId.mockResolvedValue(mockHistoricalData);

      const timeRangeDto = new TimeRangeDto();
      timeRangeDto.from = new Date('2023-05-01T00:00:00Z');
      timeRangeDto.to = new Date('2023-05-02T00:00:00Z');

      const result = await service.getHistoricalData(
        userId, 
        deviceId, 
        timeRangeDto, 
        [SensorType.PH], 
        Resolution.HOURLY,
        100
      );
      
      expect(mockSensorLogRepository.getHistoricalDataByDeviceId).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId,
          resolution: Resolution.HOURLY,
          sensorTypes: [SensorType.PH],
          limit: 100
        })
      );
      expect(result).toEqual(mockHistoricalData);
    });
  });

  describe('parseTimeRange', () => {
    it('should use explicit from/to when provided', () => {
      const from = new Date('2023-05-01T00:00:00Z');
      const to = new Date('2023-05-02T00:00:00Z');
      const timeRangeDto = new TimeRangeDto();
      timeRangeDto.from = from;
      timeRangeDto.to = to;

      const result = service['parseTimeRange'](timeRangeDto);
      
      expect(result).toEqual({ from, to });
    });

    it('should parse preset values correctly', () => {
      jest.useFakeTimers().setSystemTime(new Date('2023-05-15T12:00:00Z'));
      
      const timeRangeDto = new TimeRangeDto();
      timeRangeDto.preset = TimeRangePreset.LAST_DAY;

      const result = service['parseTimeRange'](timeRangeDto);
      
      expect(result.to.toISOString().substring(0, 10)).toEqual('2023-05-15');
      expect(result.from.toISOString().substring(0, 10)).toEqual('2023-05-14');

      jest.useRealTimers();
    });

    it('should handle range string format', () => {
      const timeRangeDto = new TimeRangeDto();
      timeRangeDto.range = '2023-05-01T00:00:00Z|2023-05-02T00:00:00Z';

      const result = service['parseTimeRange'](timeRangeDto);
      
      expect(result.from.toISOString()).toEqual('2023-05-01T00:00:00.000Z');
      expect(result.to.toISOString()).toEqual('2023-05-02T00:00:00.000Z');
    });

    it('should default to last 24 hours if no valid input', () => {
      jest.useFakeTimers().setSystemTime(new Date('2023-05-15T12:00:00Z'));
      
      const result = service['parseTimeRange']({});
      
      expect(result.to.toISOString().substring(0, 10)).toEqual('2023-05-15');
      expect(result.from.toISOString().substring(0, 10)).toEqual('2023-05-14');

      jest.useRealTimers();
    });
  });

  describe('selectResolution', () => {
    it('should select RAW for ranges <= 1 hour', () => {
      const from = new Date('2023-05-01T12:00:00Z');
      const to = new Date('2023-05-01T13:00:00Z');
      
      const result = service['selectResolution']({ from, to });
      
      expect(result).toEqual(Resolution.RAW);
    });

    it('should select MINUTE for ranges <= 1 day', () => {
      const from = new Date('2023-05-01T00:00:00Z');
      const to = new Date('2023-05-02T00:00:00Z');
      
      const result = service['selectResolution']({ from, to });
      
      expect(result).toEqual(Resolution.MINUTE);
    });

    it('should select HOURLY for ranges <= 1 week', () => {
      const from = new Date('2023-05-01T00:00:00Z');
      const to = new Date('2023-05-08T00:00:00Z');
      
      const result = service['selectResolution']({ from, to });
      
      expect(result).toEqual(Resolution.HOURLY);
    });

    it('should select DAILY for ranges > 1 week', () => {
      const from = new Date('2023-05-01T00:00:00Z');
      const to = new Date('2023-05-15T00:00:00Z');
      
      const result = service['selectResolution']({ from, to });
      
      expect(result).toEqual(Resolution.DAILY);
    });
  });
}); 