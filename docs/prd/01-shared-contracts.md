# 01｜共享契约

> 本文件是所有功能模块的跨模块权威定义。实现不得在其他模块复制并改变这些语义。

## 1. 基础标量

| 类型 | 表示 | 规则 |
|---|---|---|
| `EntityId` | UUID v7 字符串 | 服务端生成，按时间大致有序 |
| `UserId` | `EntityId` | 不复用邮箱或用户名 |
| `ISODate` | `YYYY-MM-DD` | 表示 `Asia/Shanghai` 北京时间自然日 |
| `LocalTime` | `HH:mm:ss` | 24 小时制，不带日期和时区 |
| `UTCTimestamp` | RFC 3339 UTC | 例：`2026-08-29T01:30:00.000Z` |
| `ChinaTimeZone` | 字面量 `"Asia/Shanghai"` | MVP 唯一时区；北京时间，不提供用户选择 |
| `DurationMs` | 非负整数毫秒 | 常规持续时间 |
| `EquivalentMs` | 有符号整数毫秒 | 窝囊费后台规范化记账单位 |
| `MoneyMinor` | 有符号 64 位整数 | 人民币分；禁止浮点存钱 |
| `CurrencyCode` | 字面量 `"CNY"` | 首版只处理人民币，不做外币和汇率换算 |
| `Revision` | 正整数 | 乐观锁版本，从 1 开始 |
| `IdempotencyKey` | 1–128 字符串 | 资金、购买、结算和关键写入必需 |
| `Probability` | 0–1 小数 | 仅作为模型输出，不参与金额计算 |

## 2. 通用对象头

```ts
interface ContractHeader {
  schemaVersion: string;   // 例如 "1.0"
  id: EntityId;
  revision: Revision;
  createdAt: UTCTimestamp;
  updatedAt: UTCTimestamp;
}
```

策略产生的对象另带：

```ts
interface PolicyTrace {
  policyVersion: string;
  modelVersion?: string;
  catalogVersion?: string;
  inputHash: string;       // SHA-256，小写十六进制
}
```

## 3. 共享枚举

```ts
type Importance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type Urgency = "NOT_URGENT" | "UPCOMING" | "URGENT" | "OVERDUE";
type TaskStatus = "BACKLOG" | "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type TaskCategory =
  | "WRITING" | "CODING" | "DESIGN" | "RESEARCH"
  | "COMMUNICATION" | "MEETING" | "ADMIN" | "REVIEW"
  | "LEARNING" | "OTHER";
type CognitiveLoad = "LOW" | "MEDIUM" | "HIGH";
type Splittability = "ATOMIC" | "SPLITTABLE" | "REQUIRES_REVIEW";

type ActivityCategory =
  | "TYPING" | "MEETING" | "READING" | "DESIGNING"
  | "CODING" | "BROWSING_WORK" | "BROWSING_LEISURE"
  | "MEDIA_LEISURE" | "IDLE" | "AWAY" | "UNKNOWN";
type PublicWorkStatus = "WORKING" | "MEETING" | "SLACKING" | "IDLE" | "AWAY" | "OFFLINE";
type PetAction =
  | "IDLE" | "TYPE_LEFT" | "TYPE_RIGHT" | "TYPE_BOTH"
  | "MOUSE_MOVE" | "MOUSE_CLICK" | "MEETING_DAZE"
  | "READ" | "SLACK_SECRETLY" | "AWAY_DISAPPEAR" | "CELEBRATE";

type FriendRelationStatus = "NONE" | "PENDING_OUT" | "PENDING_IN" | "ACCEPTED";
type PresenceStatus = "ONLINE" | "IDLE" | "AWAY" | "DISCONNECTED" | "OFFLINE";

type LedgerEntryType =
  | "WORK_CREDIT"
  | "OVERTIME_FORFEIT_DEBIT"
  | "DISCONNECTED_WORK_FORFEIT_DEBIT"
  | "ON_TIME_REWARD_CREDIT"
  | "PURCHASE_DEBIT"
  | "REFUND_CREDIT"
  | "ADMIN_CORRECTION";
type PurchaseStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
```

新增枚举值必须让旧客户端安全降级到 `UNKNOWN`、默认动作或通用文案。

## 4. 时间与工作日

### 4.1 用户工时

```ts
interface WorkScheduleSettings {
  schemaVersion: "1.0";
  userId: UserId;
  timeZone: "Asia/Shanghai";
  workStart: LocalTime;
  workEnd: LocalTime;
  lunchStart: LocalTime;
  lunchEnd: LocalTime;
  effectiveFrom: ISODate;
  revision: Revision;
}
```

- 首个版本只支持同一自然日内的班次：`workStart < lunchStart < lunchEnd < workEnd`。
- 标准带薪时长：`standardPaidMs = (workEnd - workStart) - (lunchEnd - lunchStart)`。
- 用户手动输入全部时间，系统不得用活动识别自动修改。
- 跨日班次 `[后续]`，MVP 不支持。
- MVP 固定使用 IANA 时区 `Asia/Shanghai` 划定自然日和结算边界；不提供时区选择，也不按设备临时时区改变工作日。
- 周六、周日和法定节假日默认不是工作日；用户可对具体日期显式覆盖为工作或休息。

### 4.2 工作日会话状态

```ts
type WorkdayPhase =
  | "BEFORE_WORK" | "WORKING" | "LUNCH" | "WORKING_AFTER_LUNCH"
  | "OVERTIME" | "CLOCKED_OUT";
```

```ts
type WorkdayConnectionState = "NOT_STARTED" | "CONNECTED" | "DISCONNECTED" | "CLOSED";
```

- 只有 App 已打开、用户已登录且服务端建立 `CONNECTED` 工作日会话后才产生窝囊费；计划上班时间到达本身不自动开账。
- `DISCONNECTED` 区间不计提。结算截止前重连恢复资格并从重连时继续；不补算离线区间。
- 结算时仍为 `DISCONNECTED` 的用户不参与当日奖励资格评估，其当日全部 `WORK_CREDIT` 由同一事务写入 `DISCONNECTED_WORK_FORFEIT_DEBIT` 并转入奖励池。
- 是否产生窝囊费不由活动分类决定。

## 5. 窝囊费唯一货币契约

### 5.1 基本原则

- 用户界面只显示“窝囊费”这一种货币。
- 服务端账本以 `EquivalentMs` 保存规范化购买力，这是会计实现单位，不是第二种用户货币。
- 日薪只改变单位时间显示价值，不改变等价时间购买力。
- 首版所有日薪、商品报价、加班扣减和奖励池金额均为人民币分，`currency` 固定为 `CNY`。

```ts
interface NangFeeRateSnapshot {
  schemaVersion: "1.0";
  userId: UserId;
  workdayDate: ISODate;
  currency: "CNY";
  dailySalaryMinor: MoneyMinor;
  standardPaidMs: DurationMs;
  settingsRevision: Revision;
}

interface NangFeeWallet {
  schemaVersion: "1.0";
  userId: UserId;
  balanceEquivalentMs: EquivalentMs;
  lifetimeEarnedEquivalentMs: DurationMs;
  lifetimeOvertimeForfeitedEquivalentMs: DurationMs;
  lifetimeDisconnectedWorkForfeitedEquivalentMs: DurationMs;
  lifetimeRewardReceivedEquivalentMs: DurationMs;
  lifetimeRewardReceivedMinor: MoneyMinor;
  rewardConversionRemainderMs: string; // [0, 1) 的十进制毫秒余量，不是用户货币
  revision: Revision;
}
```

### 5.2 计算公式

```text
unitNangFeePerMs = dailySalaryMinor / standardPaidMs
walletDisplayMinor = roundHalfAwayFromZero(balanceEquivalentMs × dailySalaryMinor / standardPaidMs)
itemDisplayPriceMinor = ceil(requiredWorkMs × dailySalaryMinor / standardPaidMs)
```

- 所有乘除使用整数、Decimal 或有理数实现，禁止 IEEE-754 浮点参与账本。
- `walletDisplayMinor` 只是当前用户工资快照下的展示值。
- 购买时实际扣除 `requiredWorkMs`，不是扣除展示金额换算后的近似值。
- 日薪或工时改变时，余额展示和商品显示价格等比例变化，购买力保持不变。

### 5.3 账本

```ts
interface NangFeeLedgerEntry extends ContractHeader {
  userId: UserId;
  type: LedgerEntryType;
  deltaEquivalentMs: EquivalentMs;
  balanceAfterEquivalentMs: EquivalentMs;
  displayDeltaMinorAtEntry: MoneyMinor;
  currency: "CNY";
  sourceType: "WORKDAY" | "OVERTIME_POOL" | "PURCHASE" | "REFUND" | "ADMIN";
  sourceId: EntityId;
  idempotencyKey: IdempotencyKey;
  metadata: Record<string, string | number | boolean | null>;
}
```

相同 `idempotencyKey + userId + operationType` 只能生成一次经济结果。

## 6. 加班奖励池共享契约

```ts
interface OvertimePoolContribution extends ContractHeader {
  poolCohortId: string;
  contributorUserId: UserId;
  workdayDate: ISODate;
  currency: "CNY";
  amountMinor: MoneyMinor;                    // 实际扣除并入池的人民币分
  source: "OVERTIME_FORFEIT" | "DISCONNECTED_WORK_FORFEIT";
  sourceForfeitedEquivalentMs: DurationMs;   // 只用于核对扣减来源，不作为池份额
  contributorRateSnapshot: NangFeeRateSnapshot;
  workdaySessionId: EntityId;
  ledgerEntryId: EntityId;
  firstEnteredPoolAt: UTCTimestamp;
  expiresAt: UTCTimestamp;                    // firstEnteredPoolAt 后第 7 个北京时间自然日的同一结算边界
  settlementId?: EntityId;
}

interface OvertimePoolBalanceLot extends ContractHeader {
  poolCohortId: "CN:Asia/Shanghai";
  originContributionId: EntityId;
  remainingMinor: MoneyMinor;
  firstEnteredPoolAt: UTCTimestamp;
  expiresAt: UTCTimestamp;
  status: "AVAILABLE" | "DISTRIBUTED" | "EXPIRED";
}

interface DailyCommitmentSnapshot extends ContractHeader {
  userId: UserId;
  workdayDate: ISODate;
  taskIds: EntityId[];
  committedTaskCount: number;
  frozenAt: UTCTimestamp;
  workScheduleRevision: Revision;
}

interface OvertimeRewardRecipient {
  userId: UserId;
  eligibility: "ELIGIBLE" | "INELIGIBLE" | "UNVERIFIED";
  reasonCodes: string[];
  awardedMinor: MoneyMinor;                  // 池内平均后实际到账的人民币分
  creditedEquivalentMs: EquivalentMs;       // 按收款人结算时费率写入个人规范钱包
  recipientRateSnapshot: NangFeeRateSnapshot;
  ledgerEntryId?: EntityId;
}

interface OvertimeRewardSettlement extends ContractHeader {
  poolCohortId: string;
  workdayDate: ISODate;
  cutoffAt: UTCTimestamp;
  currency: "CNY";
  totalPoolMinor: MoneyMinor;
  carriedInMinor: MoneyMinor;
  distributableMinor: MoneyMinor;
  eligibleCount: number;
  equalShareMinor: MoneyMinor;
  carriedOutRemainderMinor: MoneyMinor;
  expiredMinor: MoneyMinor;
  recipients: OvertimeRewardRecipient[];
  policyVersion: string;
  status: "PENDING" | "SETTLED" | "FAILED";
}
```

结算守恒式：

```text
carriedInMinor + 当日全部贡献 amountMinor
= 全部获奖者 awardedMinor 之和 + carriedOutRemainderMinor + expiredMinor
```

多人符合时：

```text
equalShareMinor = floor(distributableMinor / eligibleCount)
remainderMinor = distributableMinor - equalShareMinor × eligibleCount
```

奖励池固定使用 `poolCohortId = "CN:Asia/Shanghai"`，覆盖中国大陆全部注册用户，不设置最小参与人数。单一合格用户可独自领取全部可分配金额。奖励池只按人民币分汇总和均分，不把高工资贡献换算成统一工作时长。高工资用户同样加班时会贡献更多人民币窝囊费；低工资用户领取同额奖励后，会获得更多商店购买力，这是已确认的福利效果。

奖励进入个人钱包时，服务端按收款人结算时的 `NangFeeRateSnapshot` 计算：

```text
exactCreditEquivalentMs = awardedMinor × recipient.standardPaidMs / recipient.dailySalaryMinor
creditedEquivalentMs = floor(exactCreditEquivalentMs + priorRewardConversionRemainderMs)
newRewardConversionRemainderMs
  = exactCreditEquivalentMs + priorRewardConversionRemainderMs - creditedEquivalentMs
```

该换算只发生在收款人的个人钱包会计层，不改变池内 `awardedMinor`，也不抹平高工资贡献给低工资用户带来的福利。余量以小于 1 毫秒的会计余量结转，防止多次奖励系统性少记。用户以后修改日薪时，钱包与商品价格仍同比变化，不能通过改工资重复放大奖励。

已确认的结算规则：

- 每次结算先剔除 `expiresAt <= cutoffAt` 的到期 lot，再用未过期余额计算 `distributableMinor` 和个人份额。
- 无合格获奖者时全部可用余额按原 lot 滚存，不能刷新 `firstEnteredPoolAt` 或 `expiresAt`。
- 结算截止为北京时间下班时间加 5 分钟。
- 余额允许为负；负余额不可购买，后续工作收入和奖励优先抵扣。
- 每个 lot 自首次入池起保留 7 个北京时间自然日；到期金额写入可审计的 `expiredMinor` 后销毁，不退还贡献者。

## 7. 任务与 AI 建议边界

正式任务中的用户字段与 AI 建议必须分开保存：

```ts
interface UserTaskInput {
  title: string;
  dueAt: UTCTimestamp;
  importance: Importance;
}

interface TaskAnalysisProposal extends PolicyTrace {
  proposalId: EntityId;
  taskId: EntityId;
  category: TaskCategory;
  estimatedDurationMs: DurationMs;
  cognitiveLoad: CognitiveLoad;
  splittability: Splittability;
  confidence: Probability;
  rationaleCodes: string[];
}
```

Proposal 不得直接覆盖正式任务。用户接受后，由确定性 Request Assembler 生成写入请求；排程求解器只读正式输入，输出 Draft；正式 Schedule 必须由明确确认或预先允许的软计划自动激活产生。

任务标题属于 `SERVER_PRIVATE`。MVP 允许把当前任务标题发送给已披露且符合无训练/无留存要求的在线大模型进行分析，但不得写入普通日志、好友事件或跨用户训练/匿名聚合基线。个人速度学习只使用当前用户自己的历史聚合特征。

## 8. 活动识别与公开状态边界

```ts
interface FriendVisibilitySettings extends ContractHeader {
  userId: UserId;
  shareActivityWithFriends: boolean;
  showFriendPetsOnDesktop: boolean;
}

interface FriendVisibilityOverride extends ContractHeader {
  ownerUserId: UserId;
  friendUserId: UserId;
  shareActivityToFriend: boolean;
}

interface PrivateActivityObservation {
  schemaVersion: "1.0";
  observedAt: UTCTimestamp;
  category: ActivityCategory;
  confidence: Probability;
  sourceFlags: Array<"INPUT" | "FOREGROUND_APP" | "WINDOW_TITLE" | "BROWSER" | "SCREENSHOT_VISION">;
  rawContentRetained: false;
}

interface PublicActivityProjection {
  schemaVersion: "1.0";
  userId: UserId;
  status: PublicWorkStatus;
  action: PetAction;
  safeLabelKey?: string;
  startedAt: UTCTimestamp;
  expiresAt: UTCTimestamp;
  sequence: number;
}
```

好友事件中禁止包含应用名、进程路径、窗口标题、URL、截图、文档内容、按键、鼠标坐标和模型原始解释。

`shareActivityWithFriends` 控制是否向任何好友广播自己的活动；`showFriendPetsOnDesktop` 只控制本机是否渲染好友桌宠。单个好友的“不对其展示”写入 `FriendVisibilityOverride.shareActivityToFriend=false`，不改变 `ACCEPTED` 好友关系，也不影响对方是否向当前用户展示。

## 9. API 通用信封

成功：

```ts
interface ApiSuccess<T> {
  requestId: string;
  data: T;
  serverTime: UTCTimestamp;
}
```

失败：

```ts
interface ApiError {
  requestId: string;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    fieldErrors?: Array<{ field: string; code: string }>;
    details?: Record<string, unknown>;
  };
  serverTime: UTCTimestamp;
}
```

分页：游标分页 `items + nextCursor`；禁止用数据库自增 ID 暴露总用户量。

## 10. 错误码命名

格式：`DOMAIN_REASON`，例如：

- `TASK_DUE_AT_INVALID`
- `SCHEDULE_REVISION_CONFLICT`
- `ACTIVITY_PERMISSION_DENIED`
- `FRIEND_RELATION_REQUIRED`
- `NANG_FEE_BALANCE_INSUFFICIENT`
- `PURCHASE_IDEMPOTENCY_CONFLICT`
- `SETTLEMENT_ALREADY_COMPLETED`

错误信息可本地化，但客户端逻辑只能依赖 `code`。

## 11. 隐私级别

| 级别 | 示例 | 允许去向 |
|---|---|---|
| `LOCAL_RAW` | 截图、窗口标题、浏览器 URL、原始输入节奏 | 仅本机内存；截图经打码后可按已披露用途发送给视觉模型 |
| `LOCAL_DERIVED` | 应用类别、活动分类、置信度 | 本机数据库，可由用户清除 |
| `SERVER_PRIVATE` | 任务、DDL、日薪、钱包、好友关系 | 加密传输至服务端 |
| `FRIEND_VISIBLE` | 工作/会议/摸鱼/离开、桌宠动作 | 仅已接受好友 |
| `PUBLIC` | 无；MVP 不存在公开状态 | 不适用 |

## 12. 合并与变更门禁

- 修改此文件必须列出受影响模块。
- 金额、时间、结算或隐私语义变更至少新增一项契约测试。
- 破坏性字段变更必须提供迁移、双读或版本化端点。
- 任何新好友可见字段必须通过隐私审查清单。
- 数据集 Schema 与本文冲突时以本文为准，并在同一变更中修复样例。
