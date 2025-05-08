import { ApiProperty } from '@nestjs/swagger';
import { DeviceStatus } from '../../shared/enums/app.enum';

export class DeviceDto {
  @ApiProperty({
    description: 'Unique device identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Device code (ELSA-XXXX format)',
    example: 'ELSA-1234',
  })
  deviceCode: string;

  @ApiProperty({
    description: 'User ID who owns this device',
    example: '123e4567-e89b-12d3-a456-426614174111',
  })
  userId: string;

  @ApiProperty({
    description: 'Device name',
    example: 'Living Room Aquarium',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'Device connection status',
    enum: DeviceStatus,
    example: DeviceStatus.ONLINE,
  })
  status: DeviceStatus;

  @ApiProperty({
    description: 'Last time the device was online',
    example: '2023-08-01T12:34:56.789Z',
    nullable: true,
  })
  lastOnline: Date | null;

  @ApiProperty({
    description: 'Device creation date',
    example: '2023-07-01T12:34:56.789Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Device last update date',
    example: '2023-08-01T12:34:56.789Z',
  })
  updatedAt: Date;
}
