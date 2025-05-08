import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';

@Entity('sensor_logs')
@Index(['deviceId', 'timestamp'])
export class SensorLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'uuid' })
  deviceId: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'double precision', nullable: true })
  ph: number;

  @Column({ type: 'double precision', nullable: true })
  temperature: number;

  @Column({ type: 'double precision', nullable: true })
  tds: number;

  @Column({ type: 'double precision', nullable: true })
  dissolvedOxygen: number;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'deviceId' })
  device: Device;
} 