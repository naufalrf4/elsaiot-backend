import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { DeviceRepository } from '../../devices/repositories/device.repository';

@Injectable()
export class SocketRoomService {
  private readonly logger = new Logger(SocketRoomService.name);

  getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  getDeviceRoom(deviceId: string): string {
    return `device:${deviceId}`;
  }

  async assignUserToRooms(
    client: Socket,
    userId: string,
    deviceRepository: DeviceRepository,
  ): Promise<void> {
    const userRoom = this.getUserRoom(userId);
    await client.join(userRoom);
    this.logger.debug(`Client ${client.id} joined room ${userRoom}`);

    const devices = await deviceRepository.findDevicesByUserId(userId);

    for (const device of devices) {
      const deviceRoom = this.getDeviceRoom(device.id);
      await client.join(deviceRoom);
      this.logger.debug(`Client ${client.id} joined room ${deviceRoom}`);
    }

    this.logger.log(`Client ${client.id} joined ${devices.length} device rooms`);
  }
} 