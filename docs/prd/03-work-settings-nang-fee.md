# 03｜工作设置、窝囊费与加班奖励池

## 1. 目标

让用户明确填写自己的上班时间、下班时间、午休时间和日薪；按确定性规则累积或扣减窝囊费；把加班扣减公平转入准点完成者奖励池。

## 2. 已确认原则

1. 工时与日薪全部由用户输入，系统不推断、不读取劳动合同。
2. 用户只感知“窝囊费”一种货币。
3. 工资高低只影响窝囊费显示数额，不影响商店购买力。
4. 午休不增加窝囊费；下班后未跑路则开始减少。
5. 加班实际减少的人民币窝囊费不销毁，按原金额进入奖励池，不做工资率换算。
6. 完成承诺待办且准点跑路的人有资格领取；多人按人民币分平均分配。
7. 高工资用户加班会向池中贡献更多人民币窝囊费，低工资用户因此取得更多装饰购买力，这是预期福利。
8. MVP 仅面向中国大陆，工作日和结算固定使用北京时间 `Asia/Shanghai`。
9. 只有 App 已打开并建立已登录工作会话后才计提；离线区间不计提。
10. 中国区只有一个奖励池，单一合格用户也可领取；无人符合时全部滚存，每笔金额自首次入池起 7 日过期。

## 3. 设置流程

### 3.1 必填字段

| 字段 | 约束 |
|---|---|
| 时区 | 固定 `Asia/Shanghai`，不提供用户选择 |
| 日薪 | 大于 0，使用所选货币最小单位保存 |
| 上班时间 | 北京时间 |
| 午休开始/结束 | 必须位于上班区间内 |
| 下班时间 | 晚于午休结束，MVP 不跨日 |

周六、周日和法定节假日默认不工作；用户可为具体日期显式覆盖为工作或休息。

保存前显示：标准带薪时长、每小时窝囊费显示值、示例商品显示价格。该预览只是帮助理解，不是第二货币。

### 3.2 修改规则

- 设置变更带 `effectiveFrom`，默认从下一个北京时间工作日生效。
- 当天已开工后修改日薪或工时，不追溯重算已发生账本。
- 需要当天生效时必须二次确认，并从确认时刻起创建新 rate segment；不得重写历史。
- 每条账本记录保留其使用的设置版本或日薪快照。

## 4. 工作日会话

```ts
interface WorkdaySession {
  id: EntityId;
  userId: UserId;
  workdayDate: ISODate;
  scheduleRevision: Revision;
  commitmentSnapshotId?: EntityId;
  startedAt?: UTCTimestamp;
  clockedOutAt?: UTCTimestamp;
  phase: WorkdayPhase;
  connectionState: "NOT_STARTED" | "CONNECTED" | "DISCONNECTED" | "CLOSED";
  lastConnectedAt?: UTCTimestamp;
  disconnectedAt?: UTCTimestamp;
  lastAccruedAt?: UTCTimestamp;
  earnedEquivalentMs: DurationMs;
  overtimeForfeitedEquivalentMs: DurationMs;
  disconnectedWorkForfeitedEquivalentMs: DurationMs;
  outcome?: "WIN" | "TASKS_INCOMPLETE" | "OVERTIME" | "NO_COMMITMENT" | "UNVERIFIED";
  revision: Revision;
}
```

### 4.1 状态流转

```text
BEFORE_WORK → WORKING → LUNCH → WORKING_AFTER_LUNCH → OVERTIME → CLOCKED_OUT
                     └────────────────────────────────────────→ CLOCKED_OUT
```

- 用户无需点击“上班”，但只有打开 App、完成登录并建立 `CONNECTED` 会话后才开始记录；未打开 App 的时间不追溯计提。
- “跑路”是明确按钮，写入 `clockedOutAt`；下班后不点击即处于加班。
- 用户可提前跑路；提前时不再继续增加窝囊费。
- 闪退、进程退出、睡眠或网络断开不会写入“跑路”，而是进入 `DISCONNECTED`；好友端显示置灰角色，离线区间不计提也不倒扣。
- 结算截止前重新连接会恢复当日资格并从重连时继续记录，不补算离线区间；用户仍需在截止前明确“跑路”。
- 结算时会话仍为 `DISCONNECTED`，则用户失去当日领取资格，当日已产生的全部 `WORK_CREDIT` 原子扣回并转入奖励池。已经明确“跑路”的 `CLOSED` 会话不受之后连接状态影响。

## 5. 计提规则

### 5.1 有效增加区间

增加区间等于已连接区间与下列工作区间的交集：

```text
[workStart, lunchStart) ∪ [lunchEnd, min(workEnd, clockedOutAt))
```

每经过 1 毫秒有效区间，账本增加 1 等价毫秒。活动识别为摸鱼、会议、离开或未知均不改变计提，因为这不是绩效工资系统。

### 5.2 加班扣减区间

```text
[workEnd, clockedOutAt)
```

每经过 1 毫秒加班区间，用户个人规范钱包减少 1 等价毫秒。服务端同时按贡献者当日费率计算实际减少的人民币窝囊费，并生成同金额 `OvertimePoolContribution.amountMinor`；扣减与入池必须在同一数据库事务中完成。

为避免 60 个一分钟窗口和 1 个一小时窗口产生不同金额，入池金额按“累计差值”计算：

```text
cumulativeForfeitMinor(t)
  = roundHalfAwayFromZero(totalOvertimeEquivalentMs(t) × dailySalaryMinor / standardPaidMs)
newContributionMinor
  = cumulativeForfeitMinor(windowEnd) - cumulativeForfeitMinor(windowStart)
```

池内只记录 `newContributionMinor` 的人民币金额；`sourceForfeitedEquivalentMs` 仅用于审计，不参与均分。

### 5.3 结算时仍断线的当日所得转池

若用户在北京时间 `workEnd + 5 分钟` 的结算截止仍为 `DISCONNECTED`：

1. 汇总当日所有 `WORK_CREDIT` 的 `deltaEquivalentMs` 和其原始费率段；
2. 写入等量负数的 `DISCONNECTED_WORK_FORFEIT_DEBIT`，即使因此产生负余额也不得截断；
3. 按各原始费率段的累计差值生成等额人民币 `OvertimePoolContribution`，`source=DISCONNECTED_WORK_FORFEIT`；
4. 个人扣回与池贡献必须在同一事务、同一幂等键下提交；
5. 重试只读取原结果，不能重复扣回或重复入池。

该规则转移的是用户当日已经产生的全部窝囊费，不为离线区间虚构新的窝囊费。

### 5.4 断点补算

服务端不要求每毫秒写账本。建议每 60 秒或会话状态变化时，根据权威时间区间计算增量；写入使用唯一计提窗口键：

```text
accrual:{userId}:{workdayDate}:{windowStart}:{windowEnd}:{type}
```

重复请求必须返回原结果，不得重复计提。

## 6. 显示与公平购买力

假设用户 A 日薪 800 元、标准带薪 8 小时；用户 B 日薪 400 元、标准带薪 8 小时。某顶帽子价格窝囊时长为 2 小时：

| 用户 | 每小时窝囊费显示值 | 帽子显示价 | 实际扣除 |
|---|---:|---:|---:|
| A | 100 元 | 200 元窝囊费 | 2 小时等价时间 |
| B | 50 元 | 100 元窝囊费 | 2 小时等价时间 |

二者都需工作 2 小时，购买力相同。若 A 改填更高日薪，钱包显示与商品价格同步放大，不能凭空多买。

### 6.1 奖励池形成有意的跨工资福利

假设 A 每小时窝囊费为 100 元，加班 1 小时实际扣除 100 元并全部进入池；B 每小时为 50 元：

```text
只有 B 符合领取资格：B 实际到账 100 元窝囊费
B 的 2 小时商品价格：100 元
结果：A 的 1 小时加班，为 B 带来 2 小时购买力
```

如果 B 与另一人共同领取，则先把 100 元按人民币分平均，再分别按各自结算时费率记入个人钱包。池内不会先换算成等价时间。

## 7. 奖励资格

建议的可执行资格条件：

```text
eligible =
  commitmentSnapshot.committedTaskCount >= 1
  AND snapshot 中全部必要任务在 cutoffAt 前 COMPLETED
  AND clockedOutAt <= workEndAt + gracePeriod
  AND session.connectionState == CLOSED
  AND session.outcome != UNVERIFIED
```

- 资格依据冻结的 `DailyCommitmentSnapshot`，不能按结算前临时删除任务后的列表判断。
- 用户可新增任务；新增任务是否进入承诺快照应由用户明确选择。
- 已冻结任务取消需保留原因，不应静默提高资格。
- “准点”缓冲固定为 5 分钟。

## 8. 奖励池结算

### 8.1 结算输入

- `poolCohortId`；
- 北京时间工作日；
- 截止前已入账的所有贡献；
- 上日余量；
- 候选用户承诺快照、任务完成时间和跑路时间。

MVP 的 `poolCohortId` 固定为 `CN:Asia/Shanghai`，不按好友关系拆池，也不要求至少两名玩家。单一玩家符合资格时可以独自领取全部可分配余额。

### 8.2 结算流程

1. 以 `poolCohortId + workdayDate + policyVersion` 取得分布式锁。
2. 冻结本次结算输入，汇总人民币 `amountMinor`，计算结算前总池金额。
3. 先把 `expiresAt <= cutoffAt` 的 lot 标记为 `EXPIRED`，将其余额计入 `expiredMinor`；到期金额不得参与本次分配，也不退还贡献者。
4. 以剩余未过期 lot 计算 `distributableMinor`，再逐用户生成资格 reason codes。
5. 若符合人数大于 0，按人民币最小单位“分”平均分配。
6. 每位获奖者获得相同 `awardedMinor`；随后按该获奖者结算时费率写入个人规范钱包。
7. 按未过期 lot 从最早到期金额开始扣减；无法整除的人民币分余量保留在原 lot 中，不随机发给某人。
8. 标记结算完成；重试只能读取同一结果。

### 8.3 无符合者

全部未过期池余额按原 lot 滚入下一北京时间工作日，不退还贡献者，也不刷新首次入池时间或过期时间。每笔金额自首次入池起保留 7 个北京时间自然日，到期后销毁并保留审计记录。

### 8.4 显示

由于首版只处理人民币，好友场景可显示同一个“今日准点奖池共有 X 元窝囊费”。建议同时显示：

- 当前未过期奖池人民币窝囊费总额及最早过期时间；
- 个人预计可得窝囊费；
- 当前符合资格人数。

禁止展示单个贡献者的入池金额、日薪或加班时长，避免直接反推出工资。

## 9. 风控与边界

- 高日薪不增加该用户通过自己工作获得的购买力，但会在其加班时增加公共池贡献，这是预期规则；仍需限制数值范围防止溢出和明显异常输入攻击。
- 禁止客户端上传“直接加余额”；服务端只接受会话事件并自行计算。
- 服务端使用 UTC 权威时间，统一按 `Asia/Shanghai` 划定中国工作日和结算截止。
- 购买、扣减、贡献、结算均需幂等键和不可变账本。
- 允许负等价时间余额；负余额期间禁止购买，后续工作收入和奖励优先抵扣。
- 管理员修正必须成对记录操作者、原因和旧新值，不直接改历史账本。

## 10. 验收条件

1. 午休 60 分钟内余额不增加。
2. 活动被识别为摸鱼时，法定工作时段仍正常增加。
3. 下班后未跑路 10 分钟，个人减少 10 分钟等价余额，池增加按该用户费率计算出的实际人民币扣款。
4. 两人符合资格时，人民币池金额按分平均；无法整除的一分钱余量进入结转。
5. 工资翻倍后，钱包显示和物品显示价同时翻倍，仍能购买相同件数。
6. 同一计提或结算请求重放 10 次，余额只变化一次。
7. 结算前后人民币分守恒，误差为 0 分。
8. 删除被冻结任务不能让用户自动取得资格。
9. 任一界面均不出现“窝囊时长余额”或第二种可花费货币。
10. 高工资用户贡献 100 元、低工资用户单独获奖时，低工资用户实际到账 100 元，并按自己的价格获得更高购买力。
11. App 未打开的工作区间不产生窝囊费；断线后到重连前也不计提或倒扣。
12. 结算前重连并完成“跑路”可恢复资格；结算时仍断线则当日 `WORK_CREDIT` 只扣回一次并等额入池。
13. 只有一名合格用户时，该用户领取全部可分配池金额。
14. 无人符合时全部未过期金额滚存；新金额入池不能延长旧 lot 的 7 日期限，到期金额有审计记录且不参与分配。

## 11. 已确认项

| ID | 结论 | 确认日期 | 影响 |
|---|---|---|---|
| ECON-POOL-001 | 中国区统一池 `CN:Asia/Shanghai`，单人也可领取 | 2026-08-29 | 结算分片和隐私 |
| ECON-POOL-002 | 无人符合时全部未过期金额滚存 | 2026-08-29 | 经济守恒 |
| ECON-POOL-003 | 准点缓冲 5 分钟 | 2026-08-29 | 资格判定 |
| ECON-POOL-004 | 允许负余额，负数不可买 | 2026-08-29 | 扣减与 UI |
| ECON-POOL-005 | 每笔金额首次入池后 7 个北京时间自然日过期 | 2026-08-29 | lot 与审计 |
| WORKDAY-001 | 仅 App 已打开且已连接时记录；断线不等于跑路 | 2026-08-29 | 计提边界 |
| WORKDAY-002 | 周末和法定节假日默认不工作，可按日期覆盖 | 2026-08-29 | 日历范围 |
| WORKDAY-003 | 结算前重连恢复；结算时仍断线则失去资格且当日所得转池 | 2026-08-29 | 实时、钱包与池事务 |

## 12. 依赖

- 共享契约；
- 待办与承诺快照；
- 商店购买；
- API、数据字典和经济测试。
