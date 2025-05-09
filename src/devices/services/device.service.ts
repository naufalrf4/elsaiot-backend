import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeviceStatus } from '../../shared/enums/app.enum';
import { PaginatedResult } from '../../shared/interfaces/pagination.interface';
import { PairDeviceDto, UpdateDeviceDto } from '../dto';
import { Device } from '../entities/device.entity';
import { IDeviceService } from '../interfaces/device-service.interface';
import { DeviceFilterOptions } from '../interfaces/device.interface';
import { DeviceRepository } from '../repositories/device.repository';

@Injectable()
export class DeviceService implements IDeviceService {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  async findAllDevicesByUser(
    userId: string,
    filterOptions: DeviceFilterOptions,
  ): Promise<PaginatedResult<Device>> {
    const result = await this.deviceRepository.findDevicesWithFilters({
      ...filterOptions,
      userId,
    });
    
    return {
      data: result.devices as Device[],  
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  async findDeviceById(id: string, userId: string): Promise<Device> {
    const device = await this.deviceRepository.findByDeviceId(id);

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('You do not have access to this device');
    }

    return device;
  }

  async pairDevice(
    userId: string,
    pairDeviceDto: PairDeviceDto,
  ): Promise<Device> {
    const { deviceCode, name } = pairDeviceDto;

    const existingDevice =
      await this.deviceRepository.findByDeviceCode(deviceCode);

    if (existingDevice && existingDevice.userId) {
      throw new ConflictException(
        'This device is already paired with another account',
      );
    }

    const device = existingDevice || new Device();
    device.deviceCode = deviceCode;
    device.userId = userId;
    device.name = name || `Device ${deviceCode}`;
    device.status = DeviceStatus.PAIRED;

    return this.deviceRepository.save(device);
  }

  async updateDevice(
    id: string,
    userId: string,
    updateDeviceDto: UpdateDeviceDto,
  ): Promise<Device> {
    const device = await this.findDeviceById(id, userId);

    if (updateDeviceDto.name !== undefined) {
      device.name = updateDeviceDto.name;
    }

    if (
      updateDeviceDto.status !== undefined &&
      updateDeviceDto.status !== DeviceStatus.ONLINE
    ) {
      device.status = updateDeviceDto.status;
    }

    return this.deviceRepository.save(device);
  }

  async removeDevice(id: string, userId: string): Promise<void> {
    const device = await this.findDeviceById(id, userId);

    await this.deviceRepository.removeDevice(device.id);
  }

  async updateDeviceStatus(id: string, status: DeviceStatus): Promise<void> {
    const device = await this.deviceRepository.findByDeviceId(id);

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.deviceRepository.updateDeviceStatus(id, status);
  }

  async updateLastOnline(id: string): Promise<void> {
    const device = await this.deviceRepository.findByDeviceId(id);

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.deviceRepository.updateLastOnline(id);
  }
}
