import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeviceStatus } from '../../shared/enums/app.enum';
import { Device } from '../entities/device.entity';
import {
  DeviceFilterOptions,
  PaginatedDevicesResult,
} from '../interfaces/device.interface';

@Injectable()
export class DeviceRepository extends Repository<Device> {
  constructor(
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {
    super(Device, dataSource.createEntityManager());
  }

  async findByDeviceCode(deviceCode: string): Promise<Device | null> {
    return this.findOne({ where: { deviceCode } });
  }

  async findByDeviceId(id: string): Promise<Device | null> {
    return this.findOne({ where: { id } });
  }

  async findDevicesByUserId(userId: string): Promise<Device[]> {
    return this.find({ where: { userId } });
  }

  async updateLastOnline(id: string): Promise<void> {
    // Check the current status of the device
    const device = await this.findByDeviceId(id);
    const previousStatus = device ? device.status : null;
    const timestamp = new Date();
    
    await this.update(
      { id },
      { lastOnline: timestamp, status: DeviceStatus.ONLINE },
    );
    
    // If device was offline before, emit an event for status change
    if (previousStatus === DeviceStatus.OFFLINE) {
      this.eventEmitter.emit('device.status.changed', {
        deviceId: id,
        userId: device?.userId,
        status: DeviceStatus.ONLINE,
        timestamp: timestamp.toISOString(),
      });
    }
  }

  async findDeviceByCodeAndUser(
    deviceCode: string,
    userId: string,
  ): Promise<Device | null> {
    return this.findOne({ where: { deviceCode, userId } });
  }

  async findAllActive(): Promise<Device[]> {
    return this.find({ where: { status: DeviceStatus.ONLINE } });
  }

  /**
   * Find devices that should be marked as offline based on lastOnline timestamp
   * @param offlineThreshold Date threshold for considering a device offline
   * @returns Array of devices to mark as offline
   */
  async findDevicesToMarkOffline(offlineThreshold: Date): Promise<Device[]> {
    return this.createQueryBuilder('device')
      .where('device.status = :status', { status: DeviceStatus.ONLINE })
      .andWhere('device.lastOnline < :threshold OR device.lastOnline IS NULL', {
        threshold: offlineThreshold,
      })
      .getMany();
  }

  async findDevicesWithFilters(
    filterOptions: DeviceFilterOptions,
  ): Promise<PaginatedDevicesResult> {
    const { userId, status, name, page = 0, limit = 10 } = filterOptions;

    const queryBuilder = this.createQueryBuilder('device');

    // Always filter by user ID if provided (for multi-tenancy)
    if (userId) {
      queryBuilder.andWhere('device.userId = :userId', { userId });
    }

    // Filter by status if provided
    if (status) {
      queryBuilder.andWhere('device.status = :status', { status });
    }

    // Search by name if provided
    if (name) {
      queryBuilder.andWhere('device.name ILIKE :name', { name: `%${name}%` });
    }

    // Add pagination
    queryBuilder.skip(page * limit);
    queryBuilder.take(limit);

    // Order by last online date descending
    queryBuilder.orderBy('device.lastOnline', 'DESC');

    // Execute count query for pagination
    const total = await queryBuilder.getCount();

    // Execute main query
    const devices = await queryBuilder.getMany();

    // Return in the existing format to maintain backward compatibility
    return {
      devices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateDeviceStatus(id: string, status: DeviceStatus): Promise<void> {
    const device = await this.findByDeviceId(id);
    const previousStatus = device ? device.status : null;
    
    await this.update({ id }, { status });
    
    // If status has changed, emit an event
    if (previousStatus !== status && device?.userId) {
      this.eventEmitter.emit('device.status.changed', {
        deviceId: id,
        userId: device.userId,
        status,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async removeDevice(id: string): Promise<void> {
    await this.delete(id);
  }
}
