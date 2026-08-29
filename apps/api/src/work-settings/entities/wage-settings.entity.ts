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

@Entity('wage_settings')
@Index(['userId'], { unique: true })
export class WageSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string;

  /**
   * Daily salary in minor units (人民币分).
   * BIGINT to avoid floating point — e.g. ¥500.00 = 50000
   */
  @Column({ type: 'bigint', name: 'daily_salary_minor', default: 0 })
  dailySalaryMinor: string; // TypeORM returns bigint as string

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
