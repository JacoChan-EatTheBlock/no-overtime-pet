import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('work_schedule_settings')
@Index(['userId'], { unique: true })
export class WorkScheduleSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string;

  /** Work start time, e.g. "09:00" — stored as HH:mm string (UTC). */
  @Column({ type: 'varchar', length: 5, name: 'work_start', default: '09:00' })
  workStart: string;

  /** Work end time, e.g. "18:00" */
  @Column({ type: 'varchar', length: 5, name: 'work_end', default: '18:00' })
  workEnd: string;

  /** Lunch start, e.g. "12:00" */
  @Column({ type: 'varchar', length: 5, name: 'lunch_start', default: '12:00' })
  lunchStart: string;

  /** Lunch end, e.g. "13:00" */
  @Column({ type: 'varchar', length: 5, name: 'lunch_end', default: '13:00' })
  lunchEnd: string;

  @Column({ type: 'bigint', default: 1 })
  revision: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
