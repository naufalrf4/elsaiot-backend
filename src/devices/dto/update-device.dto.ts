import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DeviceStatus } from '../../shared/enums/app.enum';

export class UpdateDeviceDto {
  @ApiProperty({
    description: 'Name for the device',
    example: 'Kitchen Aquarium',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Device status',
    enum: DeviceStatus,
    required: false,
  })
  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;
}
