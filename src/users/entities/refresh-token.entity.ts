import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  token: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ nullable: true, type: 'varchar' })
  ipAddress: string | null;

  @Column({ nullable: true, type: 'varchar' })
  userAgent: string | null;

  @Column({ nullable: true, type: 'varchar' })
  deviceFingerprint: string | null;
  
  @Column({ default: false })
  isUsed: boolean;
  
  @Column({ default: false })
  isRevoked: boolean;
  
  @Column({ nullable: true, type: 'varchar' })
  previousToken: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
} 