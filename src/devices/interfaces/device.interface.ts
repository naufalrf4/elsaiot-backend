import { DeviceStatus } from '../../shared/enums/app.enum';
import { PaginationParams } from '../../shared/interfaces/pagination.interface';

export interface IDevice {
  id: string;
  deviceCode: string;
  userId: string;
  name?: string;
  status: DeviceStatus;
  lastOnline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceFilterOptions extends PaginationParams {
  userId?: string;
  status?: DeviceStatus;
  name?: string;
}

export interface PaginatedDevicesResult {
  devices: IDevice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
