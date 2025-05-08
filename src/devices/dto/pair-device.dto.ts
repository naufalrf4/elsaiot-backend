import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class PairDeviceDto {
  @ApiProperty({
    description: 'Unique device code in format ELSA-{any alphanumeric or hyphen}',
    example: 'ELSA-SIMU',
  })
  @IsString()
  @IsNotEmpty({ message: 'Device code is required' })
  @Matches(/^ELSA-[A-Z0-9-]+$/, {
    message: 'Device code must start with "ELSA-" followed by alphanumeric characters or hyphen',
  })
  deviceCode: string;

  @ApiProperty({
    description: 'Name for the device (optional)',
    example: 'Living Room Aquarium',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}
