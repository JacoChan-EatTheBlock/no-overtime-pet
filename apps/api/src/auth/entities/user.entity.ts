import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  username: string;

  @Column({ type: 'text', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 64, name: 'display_name' })
  displayName: string;

  @Column({ type: 'varchar', length: 12, name: 'friend_code', unique: true })
  friendCode: string;

  @Column({ type: 'varchar', length: 16, default: 'zh-CN' })
  locale: string;

  @Column({ type: 'varchar', length: 64, name: 'time_zone', default: 'Asia/Shanghai' })
  timeZone: string;

  @Column({ type: 'text', default: 'ACTIVE' })
  status: string;

  @Column({ type: 'bigint', default: 1 })
  revision: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
