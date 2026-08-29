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

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskImportance = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

@Entity('tasks')
@Index(['userId', 'status'])
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 256 })
  title: string;

  @Column({ type: 'timestamptz', name: 'due_at', nullable: true })
  dueAt: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'MEDIUM' })
  importance: TaskImportance;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status: TaskStatus;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 128, name: 'idempotency_key', nullable: true, unique: true })
  idempotencyKey: string | null;

  @Column({ type: 'bigint', default: 1 })
  revision: number;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
