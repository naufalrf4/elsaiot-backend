import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PairDeviceDto } from '../../src/devices/dto';
import { Device } from '../../src/devices/entities/device.entity';
import { DeviceRepository } from '../../src/devices/repositories/device.repository';
import { DeviceService } from '../../src/devices/services/device.service';
import { DeviceStatus } from '../../src/shared/enums/app.enum';

describe('DeviceService', () => {
  let service: DeviceService;
  let repository: DeviceRepository;

  const mockDeviceRepository = {
    findByDeviceId: jest.fn(),
    findByDeviceCode: jest.fn(),
    findDevicesWithFilters: jest.fn(),
    save: jest.fn(),
    updateDeviceStatus: jest.fn(),
    updateLastOnline: jest.fn(),
    removeDevice: jest.fn(),
  };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockDeviceId = '123e4567-e89b-12d3-a456-426614174001';
  const mockDeviceCode = 'ELSA-1234';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        {
          provide: DeviceRepository,
          useValue: mockDeviceRepository,
        },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
    repository = module.get<DeviceRepository>(DeviceRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findDeviceById', () => {
    it('should return a device when it exists and belongs to the user', async () => {
      const mockDevice = new Device();
      mockDevice.id = mockDeviceId;
      mockDevice.userId = mockUserId;

      mockDeviceRepository.findByDeviceId.mockResolvedValue(mockDevice);

      const result = await service.findDeviceById(mockDeviceId, mockUserId);
      expect(result).toEqual(mockDevice);
      expect(mockDeviceRepository.findByDeviceId).toHaveBeenCalledWith(
        mockDeviceId,
      );
    });

    it('should throw NotFoundException when device does not exist', async () => {
      mockDeviceRepository.findByDeviceId.mockResolvedValue(null);

      await expect(
        service.findDeviceById(mockDeviceId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      expect(mockDeviceRepository.findByDeviceId).toHaveBeenCalledWith(
        mockDeviceId,
      );
    });

    it('should throw ForbiddenException when device does not belong to user', async () => {
      const mockDevice = new Device();
      mockDevice.id = mockDeviceId;
      mockDevice.userId = 'different-user-id';

      mockDeviceRepository.findByDeviceId.mockResolvedValue(mockDevice);

      await expect(
        service.findDeviceById(mockDeviceId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
      expect(mockDeviceRepository.findByDeviceId).toHaveBeenCalledWith(
        mockDeviceId,
      );
    });
  });

  describe('pairDevice', () => {
    it('should pair a new device when device code does not exist', async () => {
      mockDeviceRepository.findByDeviceCode.mockResolvedValue(null);

      const mockDevice = new Device();
      mockDevice.id = mockDeviceId;
      mockDevice.deviceCode = mockDeviceCode;
      mockDevice.userId = mockUserId;
      mockDevice.name = 'Device ELSA-1234';
      mockDevice.status = DeviceStatus.PAIRED;

      mockDeviceRepository.save.mockResolvedValue(mockDevice);

      const pairDeviceDto: PairDeviceDto = { deviceCode: mockDeviceCode };
      const result = await service.pairDevice(mockUserId, pairDeviceDto);

      expect(result).toEqual(mockDevice);
      expect(mockDeviceRepository.findByDeviceCode).toHaveBeenCalledWith(
        mockDeviceCode,
      );
      expect(mockDeviceRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when device is already paired', async () => {
      const mockDevice = new Device();
      mockDevice.id = mockDeviceId;
      mockDevice.deviceCode = mockDeviceCode;
      mockDevice.userId = 'different-user-id';

      mockDeviceRepository.findByDeviceCode.mockResolvedValue(mockDevice);

      const pairDeviceDto: PairDeviceDto = { deviceCode: mockDeviceCode };

      await expect(
        service.pairDevice(mockUserId, pairDeviceDto),
      ).rejects.toThrow(ConflictException);
      expect(mockDeviceRepository.findByDeviceCode).toHaveBeenCalledWith(
        mockDeviceCode,
      );
      expect(mockDeviceRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateLastOnline', () => {
    it('should update last online timestamp and status', async () => {
      const mockDevice = new Device();
      mockDevice.id = mockDeviceId;

      mockDeviceRepository.findByDeviceId.mockResolvedValue(mockDevice);

      await service.updateLastOnline(mockDeviceId);

      expect(mockDeviceRepository.findByDeviceId).toHaveBeenCalledWith(
        mockDeviceId,
      );
      expect(mockDeviceRepository.updateLastOnline).toHaveBeenCalledWith(
        mockDeviceId,
      );
    });

    it('should throw NotFoundException when device does not exist', async () => {
      mockDeviceRepository.findByDeviceId.mockResolvedValue(null);

      await expect(service.updateLastOnline(mockDeviceId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDeviceRepository.findByDeviceId).toHaveBeenCalledWith(
        mockDeviceId,
      );
      expect(mockDeviceRepository.updateLastOnline).not.toHaveBeenCalled();
    });
  });
});
