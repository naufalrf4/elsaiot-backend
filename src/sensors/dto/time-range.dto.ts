import { IsDate, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export enum TimeRangePreset {
  LAST_HOUR = 'last_hour',
  LAST_DAY = 'last_day',
  LAST_WEEK = 'last_week',
  LAST_MONTH = 'last_month',
}

export class TimeRangeDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  to?: Date;

  @IsOptional()
  @IsEnum(TimeRangePreset)
  @ValidateIf((o) => !o.from && !o.to)
  preset?: TimeRangePreset;

  /**
   * Custom ISO date range string (from/to) separated by a pipe
   * Example: 2023-01-01T00:00:00Z|2023-01-31T23:59:59Z
   */
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.from && !o.to && !o.preset)
  range?: string;
} 