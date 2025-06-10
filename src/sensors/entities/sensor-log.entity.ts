import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';

@Entity('sensor_logs')
@Index(['deviceId', 'timestamp'])
export class SensorLog {
  @PrimaryColumn({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'uuid' })
  deviceId: string;

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
