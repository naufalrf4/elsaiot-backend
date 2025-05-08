import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { SensorType } from '../../shared/enums/app.enum';

@Entity('offsets')
export class Offset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deviceId: string;

  @Column({
    type: 'enum',
    enum: SensorType
  })
  sensorType: SensorType;

  @Column({ type: 'double precision' })
  minValue: number;

  @Column({ type: 'double precision' })
  maxValue: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'deviceId' })
  device: Device;
} 