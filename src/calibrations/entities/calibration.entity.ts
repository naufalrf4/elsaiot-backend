import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { SensorType } from '../../shared/enums/app.enum';

@Entity('calibrations')
export class Calibration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deviceId: string;

  @Column({
    type: 'enum',
    enum: SensorType
  })
  sensorType: SensorType;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'deviceId' })
  device: Device;
} 