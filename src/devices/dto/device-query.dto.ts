import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DeviceStatus } from '../../shared/enums/app.enum';

export class DeviceQueryDto {
  @ApiProperty({
    description: 'Filter by device status',
    enum: DeviceStatus,
    required: false,
  })
  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @ApiProperty({
    description: 'Search by device name (partial match)',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Number of items per page',
    default: 10,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description: 'Page number (0-indexed)',
    default: 0,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  page?: number = 0;
}
