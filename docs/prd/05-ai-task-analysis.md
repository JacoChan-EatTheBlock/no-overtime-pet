# 05｜AI 任务分析与个人速度学习

## 1. 目标

根据任务描述、工种、历史完成数据和剩余工作时长，提出可解释的任务类型、预计时长、认知负荷和拆分建议，并随着使用逐渐贴近用户真实速度。

## 2. 非目标

- AI 不决定任务是否重要；
- AI 不直接写入正式任务或正式日程；
- AI 不从桌面截图自动创建任务；
- 不把用户和其他用户做绩效比较；
- 不训练可识别个人内容的共享模型；MVP 也不使用跨用户匿名聚合基线。

## 3. 架构原则

采用四段式：

```text
Task Source
  → Automatic Analysis Trigger
  → AI Analysis Proposal
  → Deterministic Validator / Request Assembler
  → User-confirmed Formal Task Fields
```

每个新建任务自动触发一次分析并进入建议确认页，不在任务列表提供逐条手动分析按钮。AI 只输出 Proposal；确定性层负责 Schema、范围和权限校验，用户点击“确认建议”后才写入正式字段。

## 4. 输入

```ts
interface TaskAnalysisRequest {
  schemaVersion: "1.0";
  requestId: EntityId;
  userId: UserId;
  task: {
    taskId: EntityId;
    title: string;
    dueAt: UTCTimestamp;
    importance: Importance;
    userOverrides?: Partial<{
      category: TaskCategory;
      estimatedDurationMs: DurationMs;
      cognitiveLoad: CognitiveLoad;
      splittability: Splittability;
    }>;
  };
  profile: {
    occupationTags: string[];
    localWorkdayRemainingMs: DurationMs;
  };
  historyFeatures: TaskHistoryFeature[];
  catalogVersion: string;
}

interface TaskHistoryFeature {
  category: TaskCategory;
  titleEmbeddingCluster?: string;
  sampleCount: number;
  medianActualMs: DurationMs;
  p75ActualMs: DurationMs;
  medianEstimateRatio: number;
  confidence: Probability;
}
```

历史输入优先使用聚合特征，不把过往任务全文重复发送给在线模型。

当前任务标题允许发送给隐私说明中已披露的在线大模型，以判断任务类型、时长、认知负荷和拆分建议。标题不得进入普通日志、好友事件、跨用户训练或匿名聚合；模型供应商必须满足无训练/无留存要求。

## 5. 输出

```ts
interface TaskAnalysisProposal {
  schemaVersion: "1.0";
  proposalId: EntityId;
  taskId: EntityId;
  category: TaskCategory;
  estimatedDurationMs: DurationMs;
  estimateRangeMs: { low: DurationMs; high: DurationMs };
  cognitiveLoad: CognitiveLoad;
  splittability: Splittability;
  suggestedSubtasks?: Array<{
    title: string;
    estimatedDurationMs: DurationMs;
    order: number;
  }>;
  confidence: Probability;
  rationaleCodes: string[];
  warnings: string[];
  policyVersion: string;
  modelVersion: string;
  inputHash: string;
}
```

`rationaleCodes` 使用稳定代码，如 `SIMILAR_TASK_MEDIAN`、`USER_OVERRIDE_PRESERVED`、`DEADLINE_TIGHT`，UI 本地化解释，不依赖模型长文本。

## 6. 时长估计方法

### 6.1 冷启动

样本不足时组合：

- 任务类型目录的基准分布；
- 工种标签；
- 标题语义特征；
- 用户主动填写的时长；
- 同一任务拆分结构。

首轮要给范围而非伪精确单点，并明确“样本不足”。

### 6.2 个人校准

建议使用稳健统计，避免单次异常值直接改变估计：

```text
personalMultiplier = clamp(
  weightedMedian(actualMs / previousEstimatedMs),
  0.5,
  3.0
)
finalEstimate = baseEstimate × personalMultiplier
```

权重优先级：显式计时 > 用户回填 > 活动推断。最近样本权重略高，但需要最少样本数后才显示“已学习你的速度”。

MVP 在同类别累积 5 个高置信样本后启用个人速度校准；阈值属于版本化策略，可在固定评估集证明需要时发布新版本，但不得静默改写历史预测。

### 6.3 防泄漏

- 已完成后的实际时长不能回填到同一次预测输入中。
- 评估集按时间切分，不能随机把同一任务的相邻事件拆到训练和验证。
- 用户拒绝 AI 建议是偏好信号，不等于真实时长标签。

## 7. 校验规则

- 时长必须在 5 分钟到 40 小时之间；超过范围只能给警告并建议拆分。
- 子任务时长总和应与主任务估计误差不超过策略允许范围。
- AI 输出未知枚举、缺字段或 JSON 解析失败时，整份 Proposal 不可写入。
- 用户已有覆盖字段原样保留，Proposal 可给 alternative，但不能放在正式字段位置。
- 模型超时后使用目录基线 + 个人历史的本地确定性估计。

## 8. 数据集要求

任务类别目录样例见 `datasets/task-category-catalog.example.json`。训练/评估样本至少包含：

- 去标识化任务特征；
- 用户工种标签；
- 估计值、实际值及其来源；
- 接受/修改/拒绝结果；
- policy、model、catalog 版本；
- 时间切分字段；
- 用户删除标记。

禁止将日薪作为任务速度特征。

## 9. 评估指标

| 指标 | 目的 |
|---|---|
| 时长 MAE / Median APE | 单点误差 |
| 估计区间覆盖率 | 不确定性是否可信 |
| 分类 Macro-F1 | 避免大类掩盖小类 |
| 用户修改率 | 建议是否贴合 |
| 连续 5 次使用后的误差变化 | 是否真正个性化 |
| 按职业标签切片误差 | 发现系统性偏差 |

## 10. 验收条件

1. 新建任务后自动进入 AI 建议确认页，任务列表不出现逐条分析入口。
2. 模型输出永远先落 Proposal，不直接修改 Task。
3. 只有用户点击“确认建议”后，接受或修改过的字段才写入 Task。
4. 用户覆盖字段在重新分析后保持不变。
5. 模型不可用时仍可给出确定性基线估计。
6. 至少展示估计范围、置信程度和简短原因。
7. 有足够历史后，个人特征参与估计且版本可追溯。
8. 评估数据不包含日薪和可识别截图内容。
9. 注销账号或按服务端数据策略删除学习数据后，后续请求不再使用其历史特征。

## 11. 已确认项

`[已确认: AI-001][2026-08-29]` 工种标签使用预设多选 + 可选补充。
`[已确认: AI-002][2026-08-29]` 同类别 5 个高置信样本后启用个人速度。
`[已确认: AI-003][2026-08-29]` MVP 不允许跨用户匿名聚合基线。
`[已确认: AI-004][2026-08-29]` 当前任务标题可发送给已披露且满足无训练/无留存要求的在线大模型分析。

## 12. 依赖

- 待办录入；
- 共享契约与任务类别数据集；
- 日程编排；
- 隐私和数据删除能力。
