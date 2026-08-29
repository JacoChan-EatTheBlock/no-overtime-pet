import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

/**
 * Per-friend visibility override.
 * owner_id sets hidden=true to hide themselves from friend_id.
 */
@Entity('friend_visibility_overrides')
@Unique(['ownerId', 'friendId'])
export class FriendVisibilityOverrideEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'uuid', name: 'friend_id' })
  friendId: string;

  @Column({ type: 'boolean', default: false })
  hidden: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'friend_id' })
  friend: UserEntity;
}
