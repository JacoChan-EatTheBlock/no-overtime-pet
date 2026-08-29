# 14｜数据字典与实体所有权

## 1. 原则

- PostgreSQL 是跨设备正式数据事实来源，SQLite 是本地缓存和离线队列。
- 经济账本、承诺快照和结算记录不可原地改写。
- 时间使用 UTC 时间戳；MVP 工作日统一按 `Asia/Shanghai` 计算并另存北京时间自然日。
- 金额使用最小单位整数；窝囊费规范余额使用有符号等价毫秒。
- 每个可变实体带 revision、createdAt、updatedAt。

## 2. 核心实体总表

| 实体 | 所有模块 | 主键 | 关键唯一约束 |
|---|---|---|---|
| `users` | Identity | `id` | `username`、`friend_code` 唯一 |
| `auth_sessions` | Identity | `id` | refresh token hash |
| `friend_relations` | Social | `id` | 规范化用户对唯一 |
| `friend_visibility_overrides` | Social | `id` | `owner_user_id + friend_user_id` 唯一 |
| `privacy_settings` | Profile | `user_id` | 每用户一行 |
| `work_schedule_settings` | Profile | `id` | `user_id + effective_from + revision` |
| `workday_overrides` | Profile | `id` | `user_id + workday_date` |
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
| `overtime_pool_balance_lots` | Economy | `id` | `origin_contribution_id` 唯一 |
| `overtime_reward_settlements` | Economy | `id` | `cohort + date + policy` 唯一 |
| `overtime_reward_recipients` | Economy | `id` | `settlement_id + user_id` |
| `shop_items` | Commerce | `id` | `sku` 唯一 |
| `purchases` | Commerce | `id` | `user_id + idempotency_key` |
| `inventory_items` | Commerce | `id` | `user_id + shop_item_id` |
| `appearance_loadouts` | Commerce | `user_id` | 每用户一行 |
| `privacy_consents` | Profile | `id` | `user + permission + policyVersion` |

## 3. 用户与好友

### `users`

| 字段 | 类型 | 规则 |
|---|---|---|
| `id` | UUID v7 | PK |
| `username` | varchar(32) | 3–32 字符，唯一；登录使用，规范化规则上线前冻结 |
| `password_hash` | text | 仅服务端认证层可读，禁止进入普通日志和 API 响应 |
| `display_name` | varchar(64) | UI 限 1–24 Unicode 字符 |
| `friend_code` | varchar(12) | 唯一、不可枚举 |
| `locale` | varchar(16) | BCP 47 |
| `time_zone` | varchar(64) | 固定 `Asia/Shanghai`，服务端拒绝其他值 |
| `status` | enum/text | ACTIVE/SUSPENDED/DELETED |
| `revision` | bigint | 乐观锁 |

### `friend_relations`

保存 `user_low_id`、`user_high_id` 作为规范对，同时保存 requester。`user_low_id < user_high_id`，避免 A→B 和 B→A 两条记录。

索引：`(user_low_id, status)`、`(user_high_id, status)`、`requester_id`。

### 好友可见性

- `friend_visibility_overrides` 保存 `owner_user_id`、`friend_user_id`、`share_activity_to_friend` 和 revision；关闭时关系仍为 `ACCEPTED`。
- `privacy_settings` 至少保存 `share_activity_with_friends`、`show_friend_pets_on_desktop` 与 `screen_vision_enabled`，三者必须独立更新。`screen_vision_enabled` 产品默认值为 `true`，但 macOS Screen Recording 系统授权状态只在本机读取，不把“默认开启”当作“已经授权”。
- 有效活动投影条件为全局 `share_activity_with_friends=true` 且对应 `share_activity_to_friend=true`。

## 4. 设置

工作时间和工资拆表，均带 `effective_from`，以免变更一项重写另一项历史。每个工作日会话引用具体 revision。

`workday_overrides` 保存具体北京时间日期的 `is_workday` 和用户修改来源。周六、周日及法定节假日默认不工作，只有显式覆盖才改变该日期；不得因设备临时时区变化重写工作日。

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

`task_analysis_proposals` 和 `schedule_drafts` 是不可变对象。接受、拒绝或过期写状态字段，不覆盖原输出。大模型原始思维过程不保存；只存结构化输出、原因码和版本。当前任务标题可进入受控在线任务分析请求，但不得进入普通日志、跨用户聚合特征或好友事件；MVP 不建立跨用户匿名基线表。

### 承诺快照

`daily_commitment_snapshots` 只保存头信息，任务集合在 `commitment_tasks`。取消已承诺任务写 `cancelled_at`、`reason_code`、`eligibility_effect`，不得删除关联行。

## 6. 工作日和经济

### `workday_sessions`

必须引用：工时 revision、工资 revision、承诺快照 ID。另存 `connection_state`、`last_connected_at`、`disconnected_at`、`clocked_out_at`。只有 `CONNECTED` 区间计提；结算时仍 `DISCONNECTED` 的会话由幂等事务扣回当日 `WORK_CREDIT` 并转池。计提进度用 `last_accrued_at` 和累计字段加速读取，但账本仍是余额事实来源。

### `nang_fee_wallets`

```text
user_id PK
balance_equivalent_ms BIGINT NOT NULL
lifetime_earned_equivalent_ms BIGINT NOT NULL CHECK >= 0
lifetime_overtime_forfeited_equivalent_ms BIGINT NOT NULL CHECK >= 0
lifetime_disconnected_work_forfeited_equivalent_ms BIGINT NOT NULL CHECK >= 0
lifetime_reward_received_equivalent_ms BIGINT NOT NULL CHECK >= 0
lifetime_reward_received_minor BIGINT NOT NULL CHECK >= 0
reward_conversion_remainder_ms NUMERIC(20, 12) NOT NULL DEFAULT 0
revision BIGINT NOT NULL
```

`balance_equivalent_ms` 允许负数；负数时禁止购买，后续工作收入和奖励优先抵扣。其他累计字段非负。

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

`overtime_pool_contributions.amount_minor > 0`，币种固定 `CNY`，`pool_cohort_id` 固定 `CN:Asia/Shanghai`，一对一引用扣减账本。`source` 为 `OVERTIME_FORFEIT` 或 `DISCONNECTED_WORK_FORFEIT`；同时保存 `source_forfeited_equivalent_ms`、贡献者费率快照、`first_entered_pool_at` 与 `expires_at`，但池汇总和均分不得读取等价时间字段。

`overtime_pool_balance_lots` 以原贡献为粒度保存 `remaining_minor`、首次入池时间、过期时间和 `AVAILABLE/DISTRIBUTED/EXPIRED` 状态。无人符合时按原 lot 滚存，不刷新期限；每次结算先剔除 `expires_at <= cutoff_at` 的 lot，再按最早到期 lot 优先分配。每笔金额自首次入池起 7 个北京时间自然日后过期，过期金额不退还但必须审计。

断线转池事务必须在同一数据库事务中：汇总当日 `WORK_CREDIT` → 写 `DISCONNECTED_WORK_FORFEIT_DEBIT` → 更新钱包 → 创建等额人民币贡献和 lot。结算使用状态机 `PENDING → SETTLED/FAILED`；FAILED 可重试，不能生成第二份 SETTLED。

`overtime_reward_recipients` 至少保存：`awarded_minor`、`credited_equivalent_ms`、`recipient_rate_snapshot_json` 和 `ledger_entry_id`。`awarded_minor` 是池分配事实；`credited_equivalent_ms` 只是把该人民币福利固化进收款人钱包后的会计结果。

结算完成后的不变量：

```text
SUM(recipients.awarded_minor) + carried_out_remainder_minor + expired_minor
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
- `activity_feature_windows`（7 天滚动）
- `activity_classifications`（90 天滚动）

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
- AI 个人聚合特征必须支持按用户重新计算/删除；MVP 不存在跨用户聚合基线。
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
9. App 未打开或会话断线区间不产生计提；结算前重连后只从重连时继续。
10. 结算时仍断线的当日工作收入只扣回并入池一次，钱包、贡献与 lot 可用同一幂等键追溯。
11. 单一合格用户可以领取全部可分配金额；过期 lot 计入 `expired_minor` 后守恒差仍为 0。
