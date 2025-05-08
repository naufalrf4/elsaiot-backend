import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { DeviceRepository } from '../../devices/repositories/device.repository';

@Injectable()
export class SocketRoomService {
  private readonly logger = new Logger(SocketRoomService.name);

  /**
   * Get the room name for a user
   * @param userId User ID
   * @returns The room name in format 'user:{userId}'
   */
  getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * Get the room name for a device
   * @param deviceId Device ID
   * @returns The room name in format 'device:{deviceId}'
   */
  getDeviceRoom(deviceId: string): string {
    return `device:${deviceId}`;
  }

  /**
   * Assign a user to their user room and all device rooms
   * @param client Socket client
   * @param userId User ID
   * @param deviceRepository Repository to fetch devices
   */
  async assignUserToRooms(
    client: Socket,
    userId: string,
    deviceRepository: DeviceRepository,
  ): Promise<void> {
    // Join user room
    const userRoom = this.getUserRoom(userId);
    await client.join(userRoom);
    this.logger.debug(`Client ${client.id} joined room ${userRoom}`);

    // Get user's devices and join device rooms
    const devices = await deviceRepository.findDevicesByUserId(userId);

    for (const device of devices) {
      const deviceRoom = this.getDeviceRoom(device.id);
      await client.join(deviceRoom);
      this.logger.debug(`Client ${client.id} joined room ${deviceRoom}`);
    }

    this.logger.log(`Client ${client.id} joined ${devices.length} device rooms`);
  }
} 