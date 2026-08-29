# 14｜数据字典与实体所有权

## 1. 原则

- PostgreSQL 是跨设备正式数据事实来源，SQLite 是本地缓存和离线队列。
- 经济账本、承诺快照和结算记录不可原地改写。
- 时间使用 UTC 时间戳；工作日另存用户当地日期和 IANA 时区。
- 金额在 PostgreSQL 使用最小单位 `BIGINT`，JSON 使用十进制整数字符串；窝囊费规范余额使用有符号等价毫秒。
- 每个可变实体带 revision、createdAt、updatedAt。

## 2. 核心实体总表

| 实体 | 所有模块 | 主键 | 关键唯一约束 |
|---|---|---|---|
| `core_users` | Foundation | `id` | 跨模块 UUID v4；不保存密码或公开资料 |
| `account_credentials` | Identity | `user_id` | `username`、password hash 唯一边界 |
| `user_profiles` | Identity | `user_id` | `friend_code` 唯一 |
| `auth_sessions` | Identity | `id` | refresh token hash |
| `friend_relations` | Social | `id` | 规范化用户对唯一 |
| `friend_visibility_overrides` | Social | `id` | `owner_user_id + friend_user_id` 唯一 |
| `privacy_settings` | Profile | `user_id` | 每用户一行 |
| `work_schedule_settings` | Profile | `id` | `user_id + effective_from + revision` |
| `wage_settings` | Profile | `id` | `user_id + effective_from + revision` |
| `tasks` | Tasks | `id` | 无业务唯一；支持软删除 |
| `task_events` | Tasks | `id` | `idempotency_key + user_id` |
| `task_analysis_proposals` | AI Gateway | `id` | `task_id + input_hash + policy_version` |
| `schedule_drafts` | Scheduling | `id` | `request_id` |
| `schedules` | Scheduling | `id` | `user_id + workday_date + revision` |
| `schedule_blocks` | Scheduling | `id` | `schedule_id + sequence` |
| `daily_commitment_snapshots` | Tasks | `id` | `user_id + workday_date + revision` |
| `commitment_tasks` | Tasks | 复合 | `snapshot_id + task_id` |
| `workday_sessions` | Workday | `id` | `user_id + workday_date` |
| `nang_fee_wallets` | Economy | `user_id` | 每用户一行 |
| `nang_fee_ledger` | Economy | `id` | 幂等操作唯一 |
| `overtime_pool_contributions` | Economy | `id` | `ledger_entry_id` 唯一 |
| `overtime_reward_settlements` | Economy | `id` | `cohort + date + policy` 唯一 |
| `overtime_reward_recipients` | Economy | `id` | `settlement_id + user_id` |
| `shop_items` | Commerce | `id` | `sku` 唯一 |
| `purchases` | Commerce | `id` | `user_id + idempotency_key` |
| `inventory_items` | Commerce | `id` | `user_id + shop_item_id` |
| `appearance_loadouts` | Commerce | `user_id` | 每用户一行 |
| `privacy_consents` | Profile | `id` | `user + permission + policyVersion` |

## 3. 用户与好友

### `core_users`

| 字段 | 类型 | 规则 |
|---|---|---|
| `id` | UUID v4 | PK |
| `status` | enum/text | ACTIVE/DELETED |
| `revision` | bigint | 乐观锁，从 1 开始 |
| `created_at` / `updated_at` | timestamptz | UTC |
| `deleted_at` | timestamptz nullable | 软删除 |

`core_users` 是 Foundation 提供的最小跨模块身份，不保存密码、用户名、显示名或好友码。账号模块使用 1000 段迁移建立以下一对一表：

### `account_credentials`

| 字段 | 类型 | 规则 |
|---|---|---|
| `user_id` | UUID v4 | PK/FK → `core_users.id` |
| `username` | varchar(32) | 3–32 字符，唯一；登录使用，规范化规则上线前冻结 |
| `password_hash` | text | 仅服务端认证层可读，禁止进入普通日志和 API 响应 |
| `created_at` / `updated_at` | timestamptz | UTC |

### `user_profiles`

| 字段 | 类型 | 规则 |
|---|---|---|
| `user_id` | UUID v4 | PK/FK → `core_users.id` |
| `display_name` | varchar(64) | UI 限 1–24 Unicode 字符 |
| `friend_code` | varchar(12) | 唯一、不可枚举 |
| `locale` | varchar(16) | BCP 47 |
| `time_zone` | varchar(64) | IANA |
| `revision` | bigint | 乐观锁 |

### `friend_relations`

保存 `user_low_id`、`user_high_id` 作为规范对，同时保存 requester。`user_low_id < user_high_id`，避免 A→B 和 B→A 两条记录。

索引：`(user_low_id, status)`、`(user_high_id, status)`、`requester_id`。

### 好友可见性

- `friend_visibility_overrides` 保存 `owner_user_id`、`friend_user_id`、`share_activity_to_friend` 和 revision；关闭时关系仍为 `ACCEPTED`。
- `privacy_settings` 至少保存 `share_activity_with_friends` 与 `show_friend_pets_on_desktop`，两者必须独立更新。
- 有效活动投影条件为全局 `share_activity_with_friends=true` 且对应 `share_activity_to_friend=true`。

## 4. 设置

工作时间和工资拆表，均带 `effective_from`，以免变更一项重写另一项历史。每个工作日会话引用具体 revision。

工资字段：`currency char(3) check (currency = 'CNY')`、`daily_salary_minor bigint check > 0`。首版 UI 不提供币种选择；禁止存 `hourly_wage` 作为事实字段，小时显示值随标准带薪时长计算。

## 5. 任务、建议和日程

### `tasks`

关键字段：

- 用户输入：`title`、`due_at`、`importance`；
- 正式分析字段：`category`、`estimated_duration_ms`、`cognitive_load`、`splittability`；
- 状态：`status`、`completed_at`、`deleted_at`；
- 追溯：`analysis_proposal_id`、`field_origins jsonb`、`revision`。

索引：`(user_id, status, due_at)`、`(user_id, updated_at desc)`。

### Proposal 与 Draft

`task_analysis_proposals` 和 `schedule_drafts` 是不可变对象。接受、拒绝或过期写状态字段，不覆盖原输出。大模型原始思维过程不保存；只存结构化输出、原因码和版本。

### 承诺快照

`daily_commitment_snapshots` 只保存头信息，任务集合在 `commitment_tasks`。取消已承诺任务写 `cancelled_at`、`reason_code`、`eligibility_effect`，不得删除关联行。

## 6. 工作日和经济

### `workday_sessions`

必须引用：工时 revision、工资 revision、承诺快照 ID。计提进度用 `last_accrued_at` 和累计字段加速读取，但账本仍是余额事实来源。

### `nang_fee_wallets`

```text
user_id PK
balance_equivalent_ms BIGINT NOT NULL
lifetime_earned_equivalent_ms BIGINT NOT NULL CHECK >= 0
lifetime_overtime_forfeited_equivalent_ms BIGINT NOT NULL CHECK >= 0
lifetime_reward_received_equivalent_ms BIGINT NOT NULL CHECK >= 0
lifetime_reward_received_minor BIGINT NOT NULL CHECK >= 0
reward_conversion_remainder_ms NUMERIC(20, 12) NOT NULL DEFAULT 0
revision BIGINT NOT NULL
```

`balance_equivalent_ms` 是否允许负数由 `ECON-POOL-004` 决定。其他累计字段非负。

### `nang_fee_ledger`

```text
id, user_id, entry_type,
delta_equivalent_ms, balance_after_equivalent_ms,
display_delta_minor_at_entry, currency,
source_type, source_id,
rate_snapshot_json,
idempotency_key, operation_type,
metadata_json, created_at
```

唯一索引：`(user_id, operation_type, idempotency_key)`。同一事务内更新 wallet 和插入 ledger。

### 池贡献与结算

`overtime_pool_contributions.amount_minor > 0`，币种固定 `CNY`，一对一引用扣减账本；同时保存 `source_forfeited_equivalent_ms` 和贡献者费率快照用于审计，但池汇总和均分不得读取等价时间字段。结算使用状态机 `PENDING → SETTLED/FAILED`；FAILED 可重试，不能生成第二份 SETTLED。

`overtime_reward_recipients` 至少保存：`awarded_minor`、`credited_equivalent_ms`、`recipient_rate_snapshot_json` 和 `ledger_entry_id`。`awarded_minor` 是池分配事实；`credited_equivalent_ms` 只是把该人民币福利固化进收款人钱包后的会计结果。

结算完成后的不变量：

```text
SUM(recipients.awarded_minor) + carried_out_remainder_minor
= carried_in_minor + SUM(contributions.amount_minor)
```

所有字段均为人民币分，守恒差必须精确为 0；禁止用浮点数或等价时间检查池守恒。

## 7. 商店与装扮

- `shop_items.required_work_ms` 是唯一购买成本事实。
- 目录可发布新版本；商品 `sku` 不复用。
- `purchases` 保存当时商品目录版本、requiredWorkMs、展示报价快照，但实际扣款以 requiredWorkMs 为准。
- `inventory_items` 对非消耗品 `(user_id, shop_item_id)` 唯一。
- `appearance_loadouts.equipped_hat_item_ids` 可用有序 JSON 数组；更新时服务端校验库存、重复项和资源兼容性，不设置固定装备数量硬上限。

## 8. 本地 SQLite

建议表：

- `local_settings_cache`
- `tasks_cache`
- `schedule_cache`
- `friends_cache`
- `asset_cache_index`
- `offline_command_queue`
- `activity_feature_windows`

禁止本地持久化：原始截图、具体按键、完整 URL、密码、refresh token 明文。

离线命令：

```ts
interface OfflineCommand {
  localCommandId: string;
  operation: string;
  payloadJson: string;
  baseRevision?: Revision;
  idempotencyKey: string;
  createdAt: UTCTimestamp;
  retryCount: number;
  status: "QUEUED" | "SENDING" | "CONFLICT" | "DONE" | "FAILED";
}
```

## 9. 删除与审计

- 任务软删除；经济账本不可删除，只能修正。
- 用户注销后，好友状态和登录会话立即失效。
- 活动特征和纠错按用户请求删除。
- AI 聚合特征必须支持按用户重新计算/删除。
- 结算记录如需保留，应与账号标识解耦但保持守恒审计。

## 10. 迁移规则

1. 先加可空字段，再部署双读/双写，再回填，最后收紧约束。
2. 枚举新增必须让旧客户端降级；删除枚举需版本升级。
3. 经济表迁移先做只读守恒校验和备份恢复演练。
4. 不允许把显示金额迁移成规范余额；规范余额始终是等价毫秒。
5. 数据集版本与数据库目录版本分别管理，不用同一自增数。

## 11. 验收条件

1. 所有核心实体能定位唯一所有模块。
2. 任务用户字段与 AI Proposal 可分开审计。
3. 工资变更不重写历史账本。
4. 经济账本重建余额与 wallet 快照一致。
5. 池结算人民币分守恒查询结果为 0 差异。
6. 高工资贡献的人民币金额未经归一化进入池，低工资获奖者的 `credited_equivalent_ms` 可高于高工资获奖者。
7. 好友删除后 presence 缓存按 TTL 清除。
8. 本地数据库扫描不包含原始截图和具体按键。
