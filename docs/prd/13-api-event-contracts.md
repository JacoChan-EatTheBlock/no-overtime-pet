# 13｜API 与实时事件契约

## 1. 通用约定

- 基础路径：`/v1`。
- 内容类型：`application/json; charset=utf-8`。
- 时间戳：RFC 3339 UTC；自然日另传 `ISODate + IanaTimeZone`。
- 认证：`Authorization: Bearer <access-token>`。
- 请求追踪：客户端可传 `X-Request-Id`，服务端始终回传。
- 版本更新：需防覆盖的写入传 `If-Match: <revision>`。
- 经济和关键写入：传 `Idempotency-Key`。
- 响应使用共享 `ApiSuccess<T>` 或 `ApiError` 信封。
- 客户端不得依赖错误 message，只依赖稳定 error code。

## 2. 接口所有权

| 域 | 前缀 | 服务端模块 |
|---|---|---|
| 账号 | `/auth`, `/me` | Identity |
| 好友 | `/friends`, `/friend-requests` | Social |
| 设置 | `/work-settings`, `/privacy-settings` | Profile |
| 任务 | `/tasks`, `/commitments` | Tasks |
| AI | `/ai/task-analysis`, `/ai/schedules` | AI Gateway |
| 正式日程 | `/schedules` | Scheduling |
| 工作日 | `/workdays` | Workday |
| 窝囊费 | `/nang-fee` | Economy |
| 商店 | `/shop`, `/purchases`, `/appearance` | Commerce |
| 实时 | WebSocket `/realtime` | Realtime Gateway |

### 2.1 账号认证

`POST /v1/auth/register` 与 `POST /v1/auth/login` 只接受用户名和密码：

```json
{
  "username": "Magnus",
  "password": "<client-provided-secret>"
}
```

不得接受或返回邮箱、手机号、验证码字段。密码只进入认证边界并立即进行安全校验/哈希处理，不进入普通日志、埋点或业务事件。MVP 不提供设备会话列表和“退出其他设备”端点。

## 3. 工作设置 API

### 3.1 读取

`GET /v1/work-settings/current`

返回 `WorkScheduleSettings` 和工资显示设置：

```ts
interface WorkSettingsResponse {
  schedule: WorkScheduleSettings;
  wage: {
    currency: "CNY";
    dailySalaryMinor: MoneyMinor;
    effectiveFrom: ISODate;
    revision: Revision;
  };
  computed: {
    standardPaidMs: DurationMs;
    displayHourlyNangFeeMinor: MoneyMinor;
  };
}
```

### 3.2 更新

`PUT /v1/work-settings`

```json
{
  "timeZone": "Asia/Taipei",
  "workStart": "09:00:00",
  "workEnd": "18:00:00",
  "lunchStart": "12:00:00",
  "lunchEnd": "13:00:00",
  "dailySalaryMinor": 80000,
  "effectiveFrom": "2026-08-30"
}
```

错误：`WORK_SETTINGS_TIME_ORDER_INVALID`、`WAGE_AMOUNT_INVALID`、`REVISION_CONFLICT`。

## 4. 任务与承诺 API

### 4.1 创建任务

`POST /v1/tasks`

```json
{
  "title": "完成联机状态接口",
  "dueAt": "2026-08-30T09:00:00.000Z",
  "importance": "HIGH"
}
```

服务端先返回正式 `Task`。创建成功后，客户端编排层必须立即自动请求该任务的 AI 分析并进入 Proposal 确认页；任务创建不能因 AI 超时而回滚，任务列表也不提供逐条分析入口。

### 4.2 更新任务

`PATCH /v1/tasks/{taskId}` + `If-Match`。

仅传要修改的字段。`fieldOrigins` 由服务端根据请求来源写入，客户端不能伪造。

### 4.3 完成任务

`POST /v1/tasks/{taskId}/complete` + `Idempotency-Key`。

```json
{
  "completedAt": "2026-08-29T08:20:00.000Z",
  "actualDurationMs": 5400000,
  "durationSource": "USER_CONFIRMED"
}
```

### 4.4 承诺快照

`POST /v1/workdays/{date}/commitments` + `Idempotency-Key`。

```json
{
  "taskIds": ["0198...", "0199..."],
  "scheduleDraftId": "019a..."
}
```

创建后返回 `DailyCommitmentSnapshot`。移除任务不得直接 PATCH 数组，使用审计型取消端点：

`POST /v1/commitments/{snapshotId}/tasks/{taskId}/cancel`

## 5. AI 分析 API

### 5.1 任务分析

`POST /v1/ai/task-analysis`

请求传 `taskId` 和当前 `taskRevision`；服务端组装隐私最小化上下文。新建任务由客户端编排层自动调用本接口。接口返回 Proposal，不写 Task。

### 5.2 接受 Proposal

`POST /v1/tasks/{taskId}/analysis-proposals/{proposalId}/accept` + `If-Match`。

```json
{
  "acceptedFields": ["category", "estimatedDurationMs", "cognitiveLoad"],
  "overrides": {
    "estimatedDurationMs": 7200000
  }
}
```

服务端确定性组装 Task Patch，返回新 revision。

客户端主操作文案统一为“确认建议”；是否接受单项、修改单项或全部拒绝仍通过上述确定性请求表达。

## 6. 日程 API

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/v1/ai/schedules/drafts` | 生成 Draft |
| `GET` | `/v1/schedules/{date}` | 当前正式日程 |
| `POST` | `/v1/schedules/{date}/confirm` | 确认 Draft 为新 revision |
| `POST` | `/v1/schedules/{date}/replan` | 基于剩余任务重排 |

确认请求：

```json
{
  "draftId": "019a...",
  "baseScheduleRevision": 3,
  "commitmentTaskIds": ["0198...", "0199..."]
}
```

正式日程和承诺快照应在同一事务或 Saga 的确定性边界中创建；任何一方失败都不能对用户表现为确认成功。

## 7. 工作日与跑路 API

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/v1/workdays/{date}` | 会话、阶段、当日结果 |
| `POST` | `/v1/workdays/{date}/start` | 建立/恢复工作日会话 |
| `POST` | `/v1/workdays/{date}/clock-out` | 明确跑路 |
| `GET` | `/v1/workdays/{date}/outcome` | 结果与奖励资格 |

跑路：

```json
{
  "clientOccurredAt": "2026-08-29T10:00:02.000Z",
  "idempotencyKey": "clockout-2026-08-29-deviceA"
}
```

服务端以接收时间和允许时钟漂移策略决定权威 `clockedOutAt`。客户端时间仅用于诊断，不能决定奖励资格。

## 8. 窝囊费 API

### 8.1 钱包

`GET /v1/nang-fee/wallet`

```ts
interface NangFeeWalletView {
  balanceEquivalentMs: EquivalentMs; // 仅业务客户端内部可用，不作为第二钱包显示
  display: {
    amountMinor: MoneyMinor;
    currency: "CNY";
    formatted: string;
  };
  rate: {
    dailySalaryMinor: MoneyMinor;
    standardPaidMs: DurationMs;
    settingsRevision: Revision;
  };
  revision: Revision;
}
```

普通 UI 只渲染 `display.formatted`。开发者调试面板若显示等价毫秒，必须明确“会计单位，非第二货币”。

### 8.2 账本

`GET /v1/nang-fee/ledger?cursor=...&limit=50`

每条记录同时返回按该记录 rate snapshot 格式化的变化说明，历史显示不因当前日薪变化而改写。

加班扣减账本必须同时返回：

```ts
interface OvertimeForfeitLedgerView {
  deltaEquivalentMs: EquivalentMs;
  displayDeltaMinorAtEntry: MoneyMinor; // 负数，人民币分
  poolContributionMinor: MoneyMinor;    // 正数，等于该次实际扣除金额绝对值
  currency: "CNY";
  rateSnapshot: NangFeeRateSnapshot;
}
```

### 8.3 奖励结算

结算是内部任务，不开放给普通客户端触发：

`POST /internal/v1/overtime-pools/{cohortId}/{date}/settle`

必须使用服务身份、分布式锁和幂等键。客户端通过 `GET /v1/workdays/{date}/outcome` 读取结果。

结算及个人结果使用人民币金额：

```ts
interface OvertimePoolSettlementView {
  currency: "CNY";
  totalPoolMinor: MoneyMinor;
  eligibleCount: number;
  equalShareMinor: MoneyMinor;
  carriedOutRemainderMinor: MoneyMinor;
}

interface OvertimeRewardReceiptView {
  currency: "CNY";
  awardedMinor: MoneyMinor;            // 实际领取的人民币窝囊费
  creditedEquivalentMs: EquivalentMs; // 个人钱包会计值，不向普通 UI 显示
  recipientRateSnapshot: NangFeeRateSnapshot;
}
```

池内不得返回或接受 `totalPoolEquivalentMs`、`equalShareEquivalentMs` 等归一化分配字段。普通 UI 展示 `awardedMinor`；同一结算的合格用户获得相同人民币分金额，而不是相同等价时间。

## 9. 商店 API

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/v1/shop/catalog` | 商品和个性化显示报价 |
| `POST` | `/v1/purchases` | 原子购买 |
| `GET` | `/v1/inventory` | 已拥有物品 |
| `PUT` | `/v1/appearance` | 装备角色和帽子顺序 |

购买：

```json
{
  "itemId": "019b...",
  "quoteCatalogVersion": "shop-2026-08-29",
  "idempotencyKey": "purchase-deviceA-018f..."
}
```

同键不同 itemId 返回 `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`。

## 10. 好友 API

遵循 `02-account-friends.md`。所有接受、删除和可见性设置请求都必须服务端验证当前用户身份；请求体不得传“操作者 userId”。MVP 不提供拉黑端点。

`PUT /v1/friends/{userId}/visibility`

```json
{
  "shareActivityToFriend": false
}
```

该请求只改变当前用户到指定好友的单向活动投影，不改变 `ACCEPTED` 关系。

## 11. 隐私设置 API

`GET /v1/privacy-settings`、`PUT /v1/privacy-settings`。

在线截图识别授权应记录：授权版本、时间、设备、供应商策略版本。撤销后本地先停止采集，再异步同步服务端，不等待网络成功。

隐私设置至少包含两个独立布尔值：`shareActivityWithFriends` 与 `showFriendPetsOnDesktop`。前者控制自己的全局活动广播，后者只控制本机是否显示好友桌宠，客户端不得把它们合并成一个开关。

## 12. WebSocket 事件信封

```ts
interface RealtimeEvent<T> {
  schemaVersion: "1.0";
  eventId: EntityId;
  type: string;
  subjectUserId: UserId;
  sequence: number;
  publishedAt: UTCTimestamp;
  expiresAt?: UTCTimestamp;
  payload: T;
}
```

客户端 ACK 只用于诊断，不改变业务事实。断线重连通过 `presence.snapshot` 恢复当前状态。

## 13. 事件载荷

### 13.1 `presence.updated`

```ts
interface PresenceUpdatedPayload {
  presence: PresenceStatus;
  workStatus: PublicWorkStatus;
  safeLabelKey?: string;
  clockOutState: "NOT_STARTED" | "AT_WORK" | "CLOCKED_OUT_ON_TIME" | "CLOCKED_OUT_LATE";
}
```

### 13.2 `pet.action.updated`

```ts
interface PetActionUpdatedPayload {
  action: PetAction;
  intensity: 1 | 2 | 3;
  actionStartedAt: UTCTimestamp;
  suggestedDurationMs: DurationMs;
}
```

### 13.3 `appearance.updated`

```ts
interface AppearanceUpdatedPayload {
  characterItemId: EntityId;
  equippedHatItemIds: EntityId[];
  assetVersions: Record<string, string>;
}
```

事件 Schema 禁止新增任何 `raw*`、`window*`、`url*`、`taskTitle`、`salary*` 字段。

## 14. 重试与限流

- GET 可指数退避自动重试。
- 幂等 POST 可用同一键重试。
- 非幂等 PATCH 在超时后先读取资源版本再决定，不盲重放。
- 429 返回 `Retry-After`。
- 实时动作由客户端和网关双重限流，默认每用户每秒最多 1 条动作更新。

## 15. 验收条件

1. OpenAPI 中所有对象引用共享 Schema，无重复冲突枚举。
2. 所有经济写入要求幂等键并通过重放测试。
3. 所有可更新资源通过 revision 防止覆盖。
4. WebSocket 事件通过隐私字段 denylist 和 allowlist 双重校验。
5. 旧事件、过期事件和乱序事件不会回滚好友状态。
6. 服务端时间而非客户端时间决定计提、跑路和结算。
