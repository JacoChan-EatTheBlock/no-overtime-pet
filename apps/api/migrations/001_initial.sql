-- ============================================================
-- 不要加班 (No Overtime Pet) — Initial Schema Migration
-- ============================================================
-- Target: Supabase PostgreSQL
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- All statements are idempotent (IF NOT EXISTS) — safe to re-run.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ──────────────────────────────────────────────────
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

-- ── Auth Sessions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tasks ──────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

-- ── Work Schedule Settings ─────────────────────────────────
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

-- ── Wage Settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wage_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_salary_minor BIGINT DEFAULT 0,
  revision BIGINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Friend Relations ───────────────────────────────────────
-- Normalized pair: user_low_id < user_high_id to avoid duplicate friendships
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
CREATE INDEX IF NOT EXISTS idx_fr_low_status ON friend_relations(user_low_id, status);
CREATE INDEX IF NOT EXISTS idx_fr_high_status ON friend_relations(user_high_id, status);

-- ── Friend Visibility Overrides ────────────────────────────
CREATE TABLE IF NOT EXISTS friend_visibility_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, friend_id)
);

-- ── TypeORM Migration Tracking ─────────────────────────────
-- This table is auto-created by TypeORM but we ensure it exists
-- so migrationsRun: true can track what has been applied.
CREATE TABLE IF NOT EXISTS typeorm_migrations (
  id SERIAL PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL
);

-- Mark this migration as already applied (prevents TypeORM from re-running)
INSERT INTO typeorm_migrations (timestamp, name)
SELECT 1724900000000, 'InitialSchema1724900000000'
WHERE NOT EXISTS (
  SELECT 1 FROM typeorm_migrations WHERE name = 'InitialSchema1724900000000'
);
