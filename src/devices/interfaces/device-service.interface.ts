import { DeviceStatus } from 'src/shared/enums/app.enum';
import { PaginatedResult } from '../../shared/interfaces/pagination.interface';
import { PairDeviceDto, UpdateDeviceDto } from '../dto';
import { Device } from '../entities/device.entity';
import { DeviceFilterOptions } from './device.interface';

export interface IDeviceService {
  /**
   * Find all devices belonging to a user with optional filtering
   */
  findAllDevicesByUser(
    userId: string,
    filterOptions: DeviceFilterOptions,
  ): Promise<PaginatedResult<Device>>;

  /**
   * Find a specific device by ID, ensuring it belongs to the specified user
   */
  findDeviceById(id: string, userId: string): Promise<Device>;

  /**
   * Pair a device with a user account
   */
  pairDevice(userId: string, pairDeviceDto: PairDeviceDto): Promise<Device>;

  /**
   * Update device properties
   */
  updateDevice(
    id: string,
    userId: string,
    updateDeviceDto: UpdateDeviceDto,
  ): Promise<Device>;

  /**
   * Remove a device pairing
   */
  removeDevice(id: string, userId: string): Promise<void>;

  /**
   * Update device status
   */
  updateDeviceStatus(id: string, status: DeviceStatus): Promise<void>;

  /**
   * Update device last online timestamp and set status to ONLINE
   */
  updateLastOnline(id: string): Promise<void>;
}
