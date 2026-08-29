-- ═══════════════════════════════════════════════════════════════════════
-- 不要加班 — 初始数据库迁移
-- 目标: Supabase PostgreSQL
-- 版本: 001_initial_schema
-- 日期: 2026-08-29
-- 基于: PRD v2.0 数据字典 (14-data-dictionary.md)
-- ═══════════════════════════════════════════════════════════════════════

-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════
-- 1. 用户与认证
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        VARCHAR(32) NOT NULL,
  password_hash   TEXT NOT NULL,
  display_name    VARCHAR(64) NOT NULL,
  friend_code     VARCHAR(12) NOT NULL,
  locale          VARCHAR(16) NOT NULL DEFAULT 'zh-CN',
  time_zone       VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai'
                  CHECK (time_zone = 'Asia/Shanghai'),
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
  revision        BIGINT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_username_unique UNIQUE (username),
  CONSTRAINT users_friend_code_unique UNIQUE (friend_code),
  CONSTRAINT users_username_length CHECK (char_length(username) BETWEEN 3 AND 32),
  CONSTRAINT users_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 24)
);

CREATE TABLE auth_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT auth_sessions_token_unique UNIQUE (refresh_token_hash)
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. 好友与隐私
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE friend_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low_id     UUID NOT NULL REFERENCES users(id),
  user_high_id    UUID NOT NULL REFERENCES users(id),
  requester_id    UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'ACCEPTED', 'DELETED')),
  revision        BIGINT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT friend_relations_pair_unique UNIQUE (user_low_id, user_high_id),
  CONSTRAINT friend_relations_order CHECK (user_low_id < user_high_id)
);

CREATE INDEX idx_friend_relations_low ON friend_relations(user_low_id, status);
CREATE INDEX idx_friend_relations_high ON friend_relations(user_high_id, status);

CREATE TABLE friend_visibility_overrides (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id           UUID NOT NULL REFERENCES users(id),
  friend_user_id          UUID NOT NULL REFERENCES users(id),
  share_activity_to_friend BOOLEAN NOT NULL DEFAULT TRUE,
  revision                BIGINT NOT NULL DEFAULT 1,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fvo_pair_unique UNIQUE (owner_user_id, friend_user_id)
);

CREATE TABLE privacy_settings (
  user_id                     UUID PRIMARY KEY REFERENCES users(id),
  share_activity_with_friends BOOLEAN NOT NULL DEFAULT TRUE,
  show_friend_pets_on_desktop BOOLEAN NOT NULL DEFAULT TRUE,
  screen_vision_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  revision                    BIGINT NOT NULL DEFAULT 1,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. 工作设置
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE work_schedule_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  time_zone       VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai'
                  CHECK (time_zone = 'Asia/Shanghai'),
  work_start      TIME NOT NULL,
  work_end        TIME NOT NULL,
  lunch_start     TIME NOT NULL,
  lunch_end       TIME NOT NULL,
  effective_from  DATE NOT NULL,
  revision        BIGINT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT wss_time_order CHECK (
    work_start < lunch_start
    AND lunch_start < lunch_end
    AND lunch_end < work_end
  ),
  CONSTRAINT wss_user_effective_unique UNIQUE (user_id, effective_from, revision)
);

CREATE INDEX idx_wss_user_effective ON work_schedule_settings(user_id, effective_from DESC);

CREATE TABLE workday_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  workday_date    DATE NOT NULL,
  is_workday      BOOLEAN NOT NULL,
  source          TEXT NOT NULL DEFAULT 'USER'
                  CHECK (source IN ('USER', 'SYSTEM')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT wo_user_date_unique UNIQUE (user_id, workday_date)
);

CREATE TABLE wage_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  currency            CHAR(3) NOT NULL DEFAULT 'CNY'
                      CHECK (currency = 'CNY'),
  daily_salary_minor  BIGINT NOT NULL CHECK (daily_salary_minor > 0),
  effective_from      DATE NOT NULL,
  revision            BIGINT NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ws_user_effective_unique UNIQUE (user_id, effective_from, revision)
);

CREATE INDEX idx_wage_settings_user ON wage_settings(user_id, effective_from DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. 任务
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  title                 TEXT NOT NULL,
  due_at                TIMESTAMPTZ NOT NULL,
  importance            TEXT NOT NULL CHECK (importance IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status                TEXT NOT NULL DEFAULT 'BACKLOG'
                        CHECK (status IN ('BACKLOG', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  category              TEXT CHECK (category IN (
                          'WRITING', 'CODING', 'DESIGN', 'RESEARCH',
                          'COMMUNICATION', 'MEETING', 'ADMIN', 'REVIEW',
                          'LEARNING', 'OTHER'
                        )),
  estimated_duration_ms BIGINT CHECK (estimated_duration_ms > 0),
  cognitive_load        TEXT CHECK (cognitive_load IN ('LOW', 'MEDIUM', 'HIGH')),
  splittability         TEXT CHECK (splittability IN ('ATOMIC', 'SPLITTABLE', 'REQUIRES_REVIEW')),
  analysis_proposal_id  UUID,
  field_origins         JSONB,
  completed_at          TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  revision              BIGINT NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_status_due ON tasks(user_id, status, due_at);
CREATE INDEX idx_tasks_user_updated ON tasks(user_id, updated_at DESC);

CREATE TABLE task_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  task_id         UUID NOT NULL REFERENCES tasks(id),
  event_type      TEXT NOT NULL,
  payload         JSONB,
  idempotency_key VARCHAR(128) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT te_idempotency UNIQUE (user_id, idempotency_key)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 5. AI 分析
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE task_analysis_proposals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID NOT NULL REFERENCES tasks(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  input_hash        VARCHAR(64) NOT NULL,
  policy_version    VARCHAR(32) NOT NULL,
  model_version     VARCHAR(64),
  status            TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  proposed_category TEXT,
  proposed_duration_ms BIGINT,
  proposed_cognitive_load TEXT,
  proposed_splittability TEXT,
  reason_codes      JSONB,
  accepted_fields   JSONB,
  overrides         JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,

  CONSTRAINT tap_unique UNIQUE (task_id, input_hash, policy_version)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 6. 日程
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE schedule_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  request_id      VARCHAR(128) NOT NULL,
  workday_date    DATE NOT NULL,
  blocks          JSONB NOT NULL,
  policy_version  VARCHAR(32),
  model_version   VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sd_request_unique UNIQUE (request_id)
);

CREATE TABLE schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  workday_date    DATE NOT NULL,
  revision        BIGINT NOT NULL DEFAULT 1,
  draft_id        UUID REFERENCES schedule_drafts(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sched_user_date_rev UNIQUE (user_id, workday_date, revision)
);

CREATE TABLE schedule_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  task_id         UUID REFERENCES tasks(id),
  sequence        INT NOT NULL,
  start_offset_ms BIGINT NOT NULL,
  duration_ms     BIGINT NOT NULL CHECK (duration_ms > 0),
  locked          BOOLEAN NOT NULL DEFAULT FALSE,
  block_type      TEXT NOT NULL DEFAULT 'TASK'
                  CHECK (block_type IN ('TASK', 'BREAK', 'BUFFER')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sb_schedule_seq UNIQUE (schedule_id, sequence)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. 承诺快照
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE daily_commitment_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id),
  workday_date            DATE NOT NULL,
  committed_task_count    INT NOT NULL,
  work_schedule_revision  BIGINT NOT NULL,
  frozen_at               TIMESTAMPTZ NOT NULL,
  revision                BIGINT NOT NULL DEFAULT 1,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dcs_user_date_rev UNIQUE (user_id, workday_date, revision)
);

CREATE TABLE commitment_tasks (
  snapshot_id       UUID NOT NULL REFERENCES daily_commitment_snapshots(id) ON DELETE CASCADE,
  task_id           UUID NOT NULL REFERENCES tasks(id),
  cancelled_at      TIMESTAMPTZ,
  reason_code       TEXT,
  eligibility_effect TEXT,

  PRIMARY KEY (snapshot_id, task_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 8. 工作日会话
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE workday_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id),
  workday_date            DATE NOT NULL,
  work_schedule_revision  BIGINT NOT NULL,
  wage_revision           BIGINT NOT NULL,
  commitment_snapshot_id  UUID REFERENCES daily_commitment_snapshots(id),
  connection_state        TEXT NOT NULL DEFAULT 'NOT_STARTED'
                          CHECK (connection_state IN ('NOT_STARTED', 'CONNECTED', 'DISCONNECTED', 'CLOSED')),
  phase                   TEXT NOT NULL DEFAULT 'BEFORE_WORK'
                          CHECK (phase IN (
                            'BEFORE_WORK', 'WORKING', 'LUNCH',
                            'WORKING_AFTER_LUNCH', 'OVERTIME', 'CLOCKED_OUT'
                          )),
  last_connected_at       TIMESTAMPTZ,
  disconnected_at         TIMESTAMPTZ,
  clocked_out_at          TIMESTAMPTZ,
  last_accrued_at         TIMESTAMPTZ,
  accrued_equivalent_ms   BIGINT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ws_user_date UNIQUE (user_id, workday_date)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 9. 经济系统 — 钱包与账本
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE nang_fee_wallets (
  user_id                                         UUID PRIMARY KEY REFERENCES users(id),
  balance_equivalent_ms                           BIGINT NOT NULL DEFAULT 0,
  lifetime_earned_equivalent_ms                   BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_earned_equivalent_ms >= 0),
  lifetime_overtime_forfeited_equivalent_ms       BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_overtime_forfeited_equivalent_ms >= 0),
  lifetime_disconnected_work_forfeited_equivalent_ms BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_disconnected_work_forfeited_equivalent_ms >= 0),
  lifetime_reward_received_equivalent_ms          BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_reward_received_equivalent_ms >= 0),
  lifetime_reward_received_minor                  BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_reward_received_minor >= 0),
  reward_conversion_remainder_ms                  NUMERIC(20, 12) NOT NULL DEFAULT 0,
  revision                                        BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE nang_fee_ledger (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID NOT NULL REFERENCES users(id),
  entry_type                    TEXT NOT NULL CHECK (entry_type IN (
                                  'WORK_CREDIT', 'OVERTIME_FORFEIT_DEBIT',
                                  'DISCONNECTED_WORK_FORFEIT_DEBIT',
                                  'ON_TIME_REWARD_CREDIT', 'PURCHASE_DEBIT',
                                  'REFUND_CREDIT', 'ADMIN_CORRECTION'
                                )),
  delta_equivalent_ms           BIGINT NOT NULL,
  balance_after_equivalent_ms   BIGINT NOT NULL,
  display_delta_minor_at_entry  BIGINT NOT NULL,
  currency                      CHAR(3) NOT NULL DEFAULT 'CNY' CHECK (currency = 'CNY'),
  source_type                   TEXT NOT NULL,
  source_id                     UUID NOT NULL,
  rate_snapshot_json            JSONB NOT NULL,
  idempotency_key               VARCHAR(128) NOT NULL,
  operation_type                TEXT NOT NULL,
  metadata_json                 JSONB,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT nfl_idempotency UNIQUE (user_id, operation_type, idempotency_key)
);

CREATE INDEX idx_nfl_user_created ON nang_fee_ledger(user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- 10. 经济系统 — 加班奖励池
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE overtime_pool_contributions (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_cohort_id                TEXT NOT NULL DEFAULT 'CN:Asia/Shanghai',
  contributor_user_id           UUID NOT NULL REFERENCES users(id),
  workday_date                  DATE NOT NULL,
  currency                      CHAR(3) NOT NULL DEFAULT 'CNY' CHECK (currency = 'CNY'),
  amount_minor                  BIGINT NOT NULL CHECK (amount_minor > 0),
  source                        TEXT NOT NULL CHECK (source IN ('OVERTIME_FORFEIT', 'DISCONNECTED_WORK_FORFEIT')),
  source_forfeited_equivalent_ms BIGINT NOT NULL,
  contributor_rate_snapshot_json JSONB NOT NULL,
  workday_session_id            UUID NOT NULL REFERENCES workday_sessions(id),
  ledger_entry_id               UUID NOT NULL REFERENCES nang_fee_ledger(id),
  first_entered_pool_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at                    TIMESTAMPTZ NOT NULL,
  settlement_id                 UUID,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opc_ledger_unique UNIQUE (ledger_entry_id)
);

CREATE INDEX idx_opc_cohort_date ON overtime_pool_contributions(pool_cohort_id, workday_date);

CREATE TABLE overtime_pool_balance_lots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_cohort_id          TEXT NOT NULL DEFAULT 'CN:Asia/Shanghai',
  origin_contribution_id  UUID NOT NULL REFERENCES overtime_pool_contributions(id),
  remaining_minor         BIGINT NOT NULL CHECK (remaining_minor >= 0),
  first_entered_pool_at   TIMESTAMPTZ NOT NULL,
  expires_at              TIMESTAMPTZ NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'AVAILABLE'
                          CHECK (status IN ('AVAILABLE', 'DISTRIBUTED', 'EXPIRED')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opbl_origin_unique UNIQUE (origin_contribution_id)
);

CREATE INDEX idx_opbl_available ON overtime_pool_balance_lots(pool_cohort_id, status, expires_at);

CREATE TABLE overtime_reward_settlements (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_cohort_id              TEXT NOT NULL DEFAULT 'CN:Asia/Shanghai',
  workday_date                DATE NOT NULL,
  cutoff_at                   TIMESTAMPTZ NOT NULL,
  currency                    CHAR(3) NOT NULL DEFAULT 'CNY' CHECK (currency = 'CNY'),
  total_pool_minor            BIGINT NOT NULL,
  carried_in_minor            BIGINT NOT NULL,
  distributable_minor         BIGINT NOT NULL,
  expired_minor               BIGINT NOT NULL DEFAULT 0,
  eligible_count              INT NOT NULL DEFAULT 0,
  equal_share_minor           BIGINT NOT NULL DEFAULT 0,
  carried_out_remainder_minor BIGINT NOT NULL DEFAULT 0,
  policy_version              VARCHAR(32) NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING', 'SETTLED', 'FAILED')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ors_unique UNIQUE (pool_cohort_id, workday_date, policy_version)
);

CREATE TABLE overtime_reward_recipients (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id               UUID NOT NULL REFERENCES overtime_reward_settlements(id),
  user_id                     UUID NOT NULL REFERENCES users(id),
  eligibility                 TEXT NOT NULL CHECK (eligibility IN ('ELIGIBLE', 'INELIGIBLE', 'UNVERIFIED')),
  reason_codes                JSONB,
  awarded_minor               BIGINT NOT NULL DEFAULT 0,
  credited_equivalent_ms      BIGINT NOT NULL DEFAULT 0,
  recipient_rate_snapshot_json JSONB NOT NULL,
  ledger_entry_id             UUID REFERENCES nang_fee_ledger(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT orr_settlement_user UNIQUE (settlement_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 11. 商店与装扮
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE shop_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               VARCHAR(64) NOT NULL,
  item_type         TEXT NOT NULL CHECK (item_type IN ('CHARACTER', 'HAT', 'ACTION_PACK')),
  name              TEXT NOT NULL,
  description       TEXT,
  required_work_ms  BIGINT NOT NULL CHECK (required_work_ms > 0),
  asset_manifest_id VARCHAR(128),
  catalog_version   INT NOT NULL DEFAULT 1,
  is_available      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT shop_items_sku_unique UNIQUE (sku)
);

CREATE TABLE purchases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  shop_item_id        UUID NOT NULL REFERENCES shop_items(id),
  catalog_version     INT NOT NULL,
  required_work_ms    BIGINT NOT NULL,
  display_price_minor BIGINT NOT NULL,
  rate_snapshot_json  JSONB NOT NULL,
  status              TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
  idempotency_key     VARCHAR(128) NOT NULL,
  ledger_entry_id     UUID REFERENCES nang_fee_ledger(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT purchases_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE TABLE inventory_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  shop_item_id    UUID NOT NULL REFERENCES shop_items(id),
  purchase_id     UUID NOT NULL REFERENCES purchases(id),
  acquired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT inv_user_item UNIQUE (user_id, shop_item_id)
);

CREATE TABLE appearance_loadouts (
  user_id                 UUID PRIMARY KEY REFERENCES users(id),
  equipped_character_id   UUID REFERENCES inventory_items(id),
  equipped_hat_item_ids   JSONB NOT NULL DEFAULT '[]',
  revision                BIGINT NOT NULL DEFAULT 1,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 12. 隐私同意
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE privacy_consents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  permission      TEXT NOT NULL,
  policy_version  VARCHAR(32) NOT NULL,
  granted         BOOLEAN NOT NULL,
  granted_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pc_user_perm_policy UNIQUE (user_id, permission, policy_version)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 13. 触发器：自动更新 updated_at
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要 updated_at 的表创建触发器
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'friend_relations', 'friend_visibility_overrides',
      'workday_sessions', 'overtime_pool_balance_lots',
      'overtime_reward_settlements', 'shop_items', 'appearance_loadouts'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 完成！
-- ═══════════════════════════════════════════════════════════════════════
