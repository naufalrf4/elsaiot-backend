import { IsOptional, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SensorValue {
  @IsNumber()
  raw: number;

  @IsOptional()
  @IsNumber()
  voltage?: number;

  @IsOptional()
  @IsNumber()
  calibrated?: number;
}

class TemperatureValue {
  @IsNumber()
  value: number;
}

export class SensorDataDto {
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ValidateNested()
  @Type(() => SensorValue)
  ph: SensorValue;

  @ValidateNested()
  @Type(() => SensorValue)
  tds: SensorValue;

  @ValidateNested()
  @Type(() => SensorValue)
  do: SensorValue;

  @ValidateNested()
  @Type(() => TemperatureValue)
  temperature: TemperatureValue;
}
