CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS core_schema_versions (
  migration_id text PRIMARY KEY,
  checksum_sha256 text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DELETED')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS core_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES core_users(id),
  operation_type text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response_status integer NULL,
  response_body jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT core_idempotency_keys_user_operation_key_unique
    UNIQUE (user_id, operation_type, idempotency_key)
);

CREATE INDEX IF NOT EXISTS core_idempotency_keys_expires_at_idx
  ON core_idempotency_keys (expires_at);

CREATE TABLE IF NOT EXISTS core_outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  schema_version text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NULL,
  publish_attempts integer NOT NULL DEFAULT 0 CHECK (publish_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS core_outbox_events_unpublished_idx
  ON core_outbox_events (occurred_at)
  WHERE published_at IS NULL;

INSERT INTO core_schema_versions (migration_id, checksum_sha256)
VALUES ('0000_core', 'computed-by-migration-runner')
ON CONFLICT (migration_id) DO NOTHING;
