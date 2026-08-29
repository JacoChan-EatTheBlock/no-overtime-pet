import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial database schema for 不要加班 MVP.
 *
 * Tables: users, auth_sessions, tasks, work_schedule_settings,
 *         wage_settings, friend_relations, friend_visibility_overrides.
 *
 * All statements are idempotent (IF NOT EXISTS / IF EXISTS) so running
 * the migration against a database that already has the tables is safe.
 */
export class InitialSchema1724900000000 implements MigrationInterface {
  name = 'InitialSchema1724900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enable UUID extension ──────────────────────────────────────
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    // ── Users ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(32) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name VARCHAR(64) NOT NULL,
        friend_code VARCHAR(12) UNIQUE NOT NULL,
        locale VARCHAR(16) DEFAULT 'zh-CN',
        time_zone VARCHAR(64) DEFAULT 'Asia/Shanghai',
        status TEXT DEFAULT 'ACTIVE',
        revision BIGINT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Auth Sessions ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Tasks ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(256) NOT NULL,
        due_at TIMESTAMPTZ,
        importance VARCHAR(16) DEFAULT 'MEDIUM',
        status VARCHAR(16) DEFAULT 'PENDING',
        completed_at TIMESTAMPTZ,
        idempotency_key VARCHAR(128) UNIQUE,
        revision BIGINT DEFAULT 1,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_status
        ON tasks(user_id, status);
    `);

    // ── Work Schedule Settings ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS work_schedule_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        work_start VARCHAR(5) DEFAULT '09:00',
        work_end VARCHAR(5) DEFAULT '18:00',
        lunch_start VARCHAR(5) DEFAULT '12:00',
        lunch_end VARCHAR(5) DEFAULT '13:00',
        revision BIGINT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Wage Settings ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wage_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        daily_salary_minor BIGINT DEFAULT 0,
        revision BIGINT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Friend Relations ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS friend_relations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_low_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_high_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(16) DEFAULT 'PENDING',
        revision BIGINT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_low_id, user_high_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fr_low_status
        ON friend_relations(user_low_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fr_high_status
        ON friend_relations(user_high_id, status);
    `);

    // ── Friend Visibility Overrides ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS friend_visibility_overrides (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hidden BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(owner_id, friend_id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS friend_visibility_overrides;`);
    await queryRunner.query(`DROP TABLE IF EXISTS friend_relations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS wage_settings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS work_schedule_settings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks;`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_sessions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
  }
}
