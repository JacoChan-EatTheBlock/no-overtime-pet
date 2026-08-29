import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

/**
 * Normalized pair: user_low_id < user_high_id (by UUID string comparison).
 * This avoids duplicate friend rows (A→B, B→A).
 */
@Entity('friend_relations')
@Unique(['userLowId', 'userHighId'])
@Index(['userLowId', 'status'])
@Index(['userHighId', 'status'])
export class FriendRelationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The UUID that is lexicographically smaller. */
  @Column({ type: 'uuid', name: 'user_low_id' })
  userLowId: string;

  /** The UUID that is lexicographically larger. */
  @Column({ type: 'uuid', name: 'user_high_id' })
  userHighId: string;

  /** Who initiated the friend request. */
  @Column({ type: 'uuid', name: 'requester_id' })
  requesterId: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status: FriendRequestStatus;

  @Column({ type: 'bigint', default: 1 })
  revision: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_low_id' })
  userLow: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_high_id' })
  userHigh: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester: UserEntity;
}
