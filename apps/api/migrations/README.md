# 数据库迁移

## 运行迁移（连接 Supabase）

### 方式一：Supabase SQL Editor（推荐首次）

1. 打开 Supabase Dashboard → SQL Editor
2. 复制 `001_initial_schema.sql` 的全部内容
3. 点击 Run

### 方式二：命令行 psql

```bash
# 确保 .env.local 中的 DATABASE_URL 已配置
source ../.env.local

# 使用 psql 直接执行
psql "$DATABASE_URL" -f 001_initial_schema.sql
```

### 方式三：Node.js 脚本

```bash
cd apps/api
pnpm run migration:run
```

## 迁移文件

| 文件 | 说明 |
|------|------|
| `001_initial_schema.sql` | 初始 25 张表（用户/好友/任务/日程/经济/商店） |

## 表总览（25 张）

| 领域 | 表 |
|------|-----|
| 身份认证 | `users`, `auth_sessions` |
| 社交 | `friend_relations`, `friend_visibility_overrides`, `privacy_settings` |
| 设置 | `work_schedule_settings`, `workday_overrides`, `wage_settings` |
| 任务 | `tasks`, `task_events`, `task_analysis_proposals` |
| 日程 | `schedule_drafts`, `schedules`, `schedule_blocks` |
| 承诺 | `daily_commitment_snapshots`, `commitment_tasks` |
| 工作日 | `workday_sessions` |
| 经济 | `nang_fee_wallets`, `nang_fee_ledger`, `overtime_pool_contributions`, `overtime_pool_balance_lots`, `overtime_reward_settlements`, `overtime_reward_recipients` |
| 商店 | `shop_items`, `purchases`, `inventory_items`, `appearance_loadouts` |
| 隐私 | `privacy_consents` |

## 约束与规则

- 所有金额使用 `BIGINT`（人民币分），禁止浮点
- 经济账本不可变（INSERT only）
- 乐观锁 `revision` 字段
- UUID v7 主键（时间有序）
- 时区固定 `Asia/Shanghai`
- `updated_at` 自动触发器
