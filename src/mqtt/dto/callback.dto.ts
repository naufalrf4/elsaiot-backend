import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  CalibrationAction,
  CallbackPayload,
  CallbackStatus,
  SensorType,
} from '../interfaces/mqtt-message.interface';

export class CallbackDto implements CallbackPayload {
  @IsOptional()
  @IsString()
  request_id?: string;

  @IsEnum(SensorType)
  sensor: SensorType;

  @IsEnum(CalibrationAction)
  action: CalibrationAction;

  @IsEnum(CallbackStatus)
  status: CallbackStatus;

  @IsOptional()
  @IsString()
  message?: string;
}
