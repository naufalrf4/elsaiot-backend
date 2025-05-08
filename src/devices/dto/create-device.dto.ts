import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Unique device code in format ELSA-XXXX',
    example: 'ELSA-1234',
  })
  @IsString()
  @IsNotEmpty({ message: 'Device code is required' })
  @Matches(/^ELSA-\d{4}$/, {
    message: 'Device code must be in format ELSA-XXXX where X is a digit',
  })
  deviceCode: string;

  @ApiProperty({
    description: 'Name for the device (optional)',
    example: 'Living Room Aquarium',
    required: false,
  })
  @IsString()
  name?: string;
}
