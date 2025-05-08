import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { SensorDataPayload } from '../interfaces/mqtt-message.interface';

export class SensorDataDto implements SensorDataPayload {
  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsNumber()
  @Min(0)
  @Max(14)
  ph: number;

  @IsOptional()
  @IsNumber()
  ph_volt?: number;

  @IsNumber()
  @Min(0)
  @Max(2000)
  tds: number;

  @IsOptional()
  @IsNumber()
  tds_volt?: number;

  @IsNumber()
  @Min(0)
  @Max(20)
  dissolved_oxygen: number;

  @IsOptional()
  @IsNumber()
  do_volt?: number;

  @IsNumber()
  @Min(-10)
  @Max(50)
  temperature: number;
}
