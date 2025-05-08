import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SensorType } from '../../shared/enums/app.enum';
import { AggregationType, Resolution } from '../interfaces/sensor-data.interface';

export class SensorFilterDto {
  @IsOptional()
  @IsEnum(SensorType, { each: true })
  sensorTypes?: SensorType[];

  @IsOptional()
  @IsEnum(Resolution)
  resolution?: Resolution;

  @IsOptional()
  @IsEnum(AggregationType)
  aggregation?: AggregationType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number = 100;
} 