import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { SensorType } from '../../shared/enums/app.enum';

@Entity('fish_profiles')
export class FishProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fishType: string;

  @Column({
    type: 'enum',
    enum: SensorType
  })
  sensorType: SensorType;

  @Column({ type: 'double precision' })
  minValue: number;

  @Column({ type: 'double precision' })
  maxValue: number;
} 