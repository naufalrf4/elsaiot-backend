import { Test, TestingModule } from '@nestjs/testing';
import { DeviceController } from '../../src/devices/controllers/device.controller';
import { PairDeviceDto, UpdateDeviceDto } from '../../src/devices/dto';
import { Device } from '../../src/devices/entities/device.entity';
import { DeviceService } from '../../src/devices/services/device.service';
import { DeviceStatus } from '../../src/shared/enums/app.enum';

describe('DeviceController', () => {
  let controller: DeviceController;
  let service: DeviceService;

  const mockDeviceService = {
    findAllDevicesByUser: jest.fn(),
    findDeviceById: jest.fn(),
    pairDevice: jest.fn(),
    updateDevice: jest.fn(),
    removeDevice: jest.fn(),
  };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockDeviceId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceController],
      providers: [
        {
          provide: DeviceService,
          useValue: mockDeviceService,
        },
      ],
    }).compile();

    controller = module.get<DeviceController>(DeviceController);
    service = module.get<DeviceService>(DeviceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of devices', async () => {
      const mockDevice = new Device();
      mockDevice.id = mockDeviceId;
      mockDevice.userId = mockUserId;
      mockDevice.status = DeviceStatus.ONLINE;

      const mockPaginatedResult = {
        devices: [mockDevice],
        total: 1,
        page: 0,
        limit: 10,
        totalPages: 1,
      };

      mockDeviceService.findAllDevicesByUser.mockResolvedValue(
        mockPaginatedResult,
      );

      const result = await controller.findAll(mockUserId, {});

      expect(result).toEqual({
        data: [mockDevice],
        meta: {
          total: 1,
          page: 0,
          limit: 10,
          totalPages: 1,
        },
      });
      expect(mockDeviceService.findAllDevicesByUser).toHaveBeenCalledWith(
        mockUserId,
        {},
      );
    });

    it('should return data in the standardized paginated result format', async () => {
      const mockDevices = [{ id: '1', name: 'Test Device' }] as any[];
      const mockPaginatedResult = {
        data: mockDevices,
        meta: {
          total: 1,
          page: 0,
          limit: 10,
          totalPages: 1,
        },
      };
      
      mockDeviceService.findAllDevicesByUser.mockResolvedValue(mockPaginatedResult);
      
      const result = await controller.findAll('userId', {});
      
      expect(result).toEqual(mockPaginatedResult);
      expect(result.data).toEqual(mockDevices);
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toEqual(1);
    });
  });

  describe('findOne', () => {
    it('should return a device when it exists', async () => {
      const mockDevice = new Device();
      mockDevice.id = mockDeviceId;
      mockDevice.userId = mockUserId;

      mockDeviceService.findDeviceById.mockResolvedValue(mockDevice);

      const result = await controller.findOne(mockDeviceId, mockUserId);
      expect(result).toEqual(mockDevice);
      expect(mockDeviceService.findDeviceById).toHaveBeenCalledWith(
        mockDeviceId,
        mockUserId,
      );
    });
  });

  describe('pairDevice', () => {
    it('should pair a device successfully', async () => {
      const mockDevice = new Device();
      mockDevice.id = mockDeviceId;
      mockDevice.userId = mockUserId;
      mockDevice.deviceCode = 'ELSA-1234';
      mockDevice.status = DeviceStatus.PAIRED;

      const pairDeviceDto: PairDeviceDto = { deviceCode: 'ELSA-1234' };

      mockDeviceService.pairDevice.mockResolvedValue(mockDevice);

      const result = await controller.pairDevice(pairDeviceDto, mockUserId);
      expect(result).toEqual(mockDevice);
      expect(mockDeviceService.pairDevice).toHaveBeenCalledWith(
        mockUserId,
        pairDeviceDto,
      );
    });
  });

  describe('update', () => {
    it('should update a device successfully', async () => {
      const mockDevice = new Device();
      mockDevice.id = mockDeviceId;
      mockDevice.userId = mockUserId;
      mockDevice.name = 'Updated Device Name';

      const updateDeviceDto: UpdateDeviceDto = { name: 'Updated Device Name' };

      mockDeviceService.updateDevice.mockResolvedValue(mockDevice);

      const result = await controller.update(
        mockDeviceId,
        updateDeviceDto,
        mockUserId,
      );
      expect(result).toEqual(mockDevice);
      expect(mockDeviceService.updateDevice).toHaveBeenCalledWith(
        mockDeviceId,
        mockUserId,
        updateDeviceDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a device successfully', async () => {
      mockDeviceService.removeDevice.mockResolvedValue(undefined);

      await controller.remove(mockDeviceId, mockUserId);
      expect(mockDeviceService.removeDevice).toHaveBeenCalledWith(
        mockDeviceId,
        mockUserId,
      );
    });
  });
});
