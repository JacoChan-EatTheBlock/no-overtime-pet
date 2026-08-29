# 06｜AI 日程编排

## 1. 目标

在尊重用户约束的前提下，把当天任务排进可用工作时段，让用户清楚知道先做什么、何时可能做不完，并可快速确认或修改。

## 2. 核心原则

1. 用户锁定、用户顺序和用户时长优先于 AI。
2. DDL 和重要性决定业务压力；紧急性由系统计算。
3. AI 负责理解和建议，确定性求解器负责生成可验证时间表。
4. 任何排不下的任务必须明确显示，不得通过压缩时长假装可行。
5. 不以活动识别结果自动惩罚或重排；用户可主动请求“重新安排剩余时间”。

## 3. 分层架构

```text
Task + Work Settings + User Constraints
  → AI Proposal（分类、时长、拆分）
  → Validator / Request Assembler
  → Pure Scheduling Solver
  → Schedule Draft + Conflicts + Explanations
  → User Confirm / Modify
  → Formal Schedule Revision
```

参考材料中的 Proposal → 校验 → 确定性组装 → 纯求解器 → Draft 思路用于边界设计；参考文档中的代码片段未作为已验证运行代码。

## 4. 输入契约

```ts
interface ScheduleRequest {
  schemaVersion: "1.0";
  requestId: EntityId;
  userId: UserId;
  workdayDate: ISODate;
  workScheduleRevision: Revision;
  tasks: Array<{
    taskId: EntityId;
    dueAt: UTCTimestamp;
    importance: Importance;
    urgency: Urgency;
    estimatedDurationMs: DurationMs;
    cognitiveLoad: CognitiveLoad;
    splittability: Splittability;
    userLockedStartAt?: UTCTimestamp;
    userLockedOrder?: number;
  }>;
  fixedEvents: FixedEvent[];
  remainingOnly: boolean;
  policyVersion: string;
}

interface FixedEvent {
  id: EntityId;
  titleSafe: string;
  startAt: UTCTimestamp;
  endAt: UTCTimestamp;
  type: "MEETING" | "BREAK" | "PERSONAL";
}
```

午休作为系统固定不可排区间输入；用户设置中已有午休时，不允许 AI 移动。

## 5. 优先级与排程规则

建议确定性排序键，从高到低：

1. 用户锁定时间；
2. 已开始且需继续的任务；
3. 会错过 DDL 的任务；
4. `importance`；
5. `urgency`；
6. DDL 更早；
7. 高认知任务优先安排在用户历史高专注区间；
8. 减少碎片和上下文切换；
9. 稳定 taskId 作为最终确定性 tie-breaker。

排序权重必须位于 `schedule-policy-v1.example.json` 同结构的版本化策略中，不硬编码在多个端。

## 6. 时间块规则

- 原子任务不得拆分。
- 可拆分任务按策略最小块拆分，建议最小 25 分钟。
- 每 90–120 分钟建议留 5–15 分钟缓冲，但不能挤占用户午休。
- 已经过的时间不可安排新块。
- 任务块不得越过固定事件、午休、工作日结束和自身 DDL。
- 若总需求超过可用时长，返回 `UNSCHEDULED` 项和原因。

## 7. 输出

```ts
interface ScheduleDraft extends PolicyTrace {
  draftId: EntityId;
  userId: UserId;
  workdayDate: ISODate;
  baseScheduleRevision?: Revision;
  blocks: ScheduleBlock[];
  unscheduled: Array<{
    taskId: EntityId;
    reasonCode: "NO_CAPACITY" | "DEADLINE_CONFLICT" | "LOCK_CONFLICT" | "MISSING_ESTIMATE";
    neededMs: DurationMs;
  }>;
  warnings: string[];
  commitmentCandidateTaskIds: EntityId[];
}

interface ScheduleBlock {
  blockId: EntityId;
  taskId?: EntityId;
  type: "TASK" | "MEETING" | "BREAK" | "BUFFER";
  startAt: UTCTimestamp;
  endAt: UTCTimestamp;
  sequence: number;
  lockedByUser: boolean;
  rationaleCodes: string[];
}
```

## 8. 用户确认和修改

- 首次草案必须完整展示：可排任务、未排任务、预计完成时间和超载风险。
- 用户可拖动、锁定、改时长、移除或添加任务。
- 任何用户修改形成新 Draft，不直接改旧 Draft。
- 点击“确认今日安排”后生成 Formal Schedule Revision，并同时确认承诺任务集合。
- 对仅改变未锁定块顺序、且用户已开启“软计划自动优化”的重排，可自动激活；默认关闭。
- DDL、任务范围、锁定时间和承诺集合改变属于硬变化，必须确认。

## 9. 运行中重排

触发方式：

- 用户主动点击“重新安排剩余时间”；
- 用户完成任务早于或晚于预计；
- 新增紧急任务；
- 固定会议变化。

重排只修改当前时刻之后且未锁定的时间块。已完成、进行中和用户锁定块保持原样。必须展示与当前正式日程的 Diff。

## 10. 冲突与失败

- 输入版本落后：返回 `SCHEDULE_REVISION_CONFLICT`，客户端先刷新。
- 锁定块重叠：返回冲突清单，不自动删除用户锁定。
- AI 分析超时：使用现有正式时长；缺时长任务标记未排。
- 求解超时：返回当前最佳确定性 Draft 与 `SOLVER_TIMEOUT` 警告，不能写正式日程。
- 离线：本地可用最近策略求解，恢复后以版本冲突流程同步。

## 11. 验收条件

1. 同一输入和 policyVersion 重复求解得到语义一致的时间块。
2. 用户锁定时间在重排后不变化。
3. 午休和下班后不存在任务块。
4. 排不下时明确列出任务和缺少时长。
5. 用户修改的时长和顺序优先于 AI。
6. 正式日程变更可追溯到 Proposal、Draft 和用户操作。
7. 运行中重排只影响未来未锁定块。
8. 硬变化未经确认不会成为正式日程。

## 12. 待确认项

`[待确认: SCHEDULE-001]` 用户未完成任务时能否准点跑路：建议允许且不阻止，仅记录结果。  
`[待确认: SCHEDULE-002]` 是否接入系统日历。建议放到后续，MVP 只支持手动固定会议。  
`[待确认: SCHEDULE-003]` 默认时间块和休息策略。建议数据集默认 50/10，可按个人历史调整。  
`[待确认: SCHEDULE-004]` 软计划自动优化默认关闭或开启。建议默认关闭。

## 13. 依赖

- 工作设置；
- 待办和 AI 分析；
- 排程策略数据集；
- API、数据字典和测试。

