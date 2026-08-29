# 07｜Windows 桌面活动识别

## 1. 目标

在用户明确授权下，结合 Windows 前台应用、键鼠活跃度、可选浏览器信息和可选屏幕视觉识别，尽可能准确地判断用户当前处于写作、编码、开会、工作浏览、娱乐浏览、离开等宏观状态。

识别结果用于桌宠动作和无关痛痒的好友状态显示，不用于工资计提、绩效评价或自动修改任务。

## 2. 准确度取舍

- 已确认：准确度优先于在线视觉模型调用费用。
- 同时必须满足：逐级授权、最小化传输、原始内容不落盘、明确关闭入口。
- 本地信号已足够高置信时不必强制截图；这是减少隐私暴露，不是以省钱牺牲准确度。
- 若信号冲突或低置信，可调用在线视觉模型提高准确度。

## 3. 信号层级

| 信号 | 例子 | 默认 | 隐私级别 |
|---|---|---|---|
| 输入聚合 | 每秒键盘次数、鼠标移动/点击、空闲时长 | 开启 | `LOCAL_RAW` 聚合后立即丢弃细节 |
| 前台进程 | 应用签名、可执行文件名映射到类别 | 开启 | `LOCAL_DERIVED` |
| 窗口标题 | 仅用于本地规则或本地模型 | 默认关闭 | `LOCAL_RAW` |
| 浏览器域名类别 | 工作/视频/社交等，不保留完整 URL | 可选 | `LOCAL_RAW` → 类别 |
| 屏幕截图视觉 | 降采样、打码后的当前屏幕 | 单独授权 | `LOCAL_RAW`，默认不留存 |

不得采集具体按键、剪贴板内容、密码输入框内容、完整浏览历史或后台窗口正文。

## 4. 识别流水线

```text
Windows Signals
  → Local Feature Extractor
  → Sensitive-region Redaction
  → Local Rule / Model Classifier
  → Confidence & Conflict Gate
  → Optional Online Vision Classifier
  → Temporal Smoother
  → PrivateActivityObservation
  → Public Projection + Pet Action
```

### 4.1 本地特征

```ts
interface LocalActivityFeatureWindow {
  schemaVersion: "1.0";
  windowStart: UTCTimestamp;
  windowEnd: UTCTimestamp;
  keyboardEventCount: number;      // 仅数量
  mouseMoveBucket: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  mouseClickCount: number;
  idleMs: DurationMs;
  foregroundAppCategory: string;
  browserSiteCategory?: string;
  meetingSignal: boolean;
  audioDeviceInUse?: boolean;
}
```

输入钩子只产生聚合计数。键值、扫描码、鼠标坐标不得进入日志、数据库或网络。

### 4.2 在线视觉请求

仅在用户授权且本地置信不足时产生：

```ts
interface VisionClassificationRequest {
  schemaVersion: "1.0";
  requestId: EntityId;
  image: {
    mimeType: "image/jpeg" | "image/webp";
    width: number;                 // 建议最长边 ≤ 1024
    height: number;
    redactionApplied: true;
  };
  allowedLabels: ActivityCategory[];
  context: {
    foregroundAppCategory?: string;
    inputActivityBucket: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  };
  retention: "NO_PROVIDER_RETENTION";
}

interface VisionClassificationResponse {
  schemaVersion: "1.0";
  requestId: EntityId;
  category: ActivityCategory;
  confidence: Probability;
  secondaryCategory?: ActivityCategory;
  modelVersion: string;
  safetyFlags: string[];
}
```

模型只允许返回枚举分类，不把 OCR 文本、人物姓名、网站标题或视觉描述保存到业务系统。

## 5. 截图与打码

- 只截取当前活动显示器；多屏支持 `[待确认: ACTIVITY-001]`。
- 截图进入内存后先做密码管理器、支付、系统安全界面黑名单检测。
- 可识别的通知区域、任务栏账号、邮箱地址等先模糊或遮盖。
- 若打码失败或安全页面被检测到，跳过在线请求并返回 `UNKNOWN`。
- 响应成功或超时后立即释放原始像素；默认不写磁盘。
- 调试模式也不得记录真实截图；测试使用合成数据集。

## 6. 时间平滑与状态切换

避免每次切窗口让角色抖动：

- `TYPING` 可由 300–800ms 窗口快速触发拍键盘；
- 宏观状态建议连续 2 个窗口或高置信一次后切换；
- `AWAY` 按系统空闲时长触发，建议 3 分钟；
- 恢复输入后 500ms 内回到可判断状态；
- 视觉模型失败时保留最近可靠状态最多 30 秒，然后降级为 `UNKNOWN/IDLE`。

阈值全部放入版本化活动类别数据集或策略配置。

## 7. 安全状态文案

好友只看到模板化、无关痛痒的文案，例如：

| 内部分类 | 公开状态 | 文案例 |
|---|---|---|
| `CODING` / `TYPING` | `WORKING` | “正在对键盘施法” |
| `MEETING` | `MEETING` | “戴着耳机灵魂出窍” |
| `BROWSING_LEISURE` / `MEDIA_LEISURE` | `SLACKING` | “正在进行短暂的精神出逃” |
| `IDLE` | `IDLE` | “工位上只剩一具空壳” |
| `AWAY` | `AWAY` | “人没了” |

不能显示“正在看某视频”“正在编辑某客户文档”等内容。模板见 `datasets/safe-status-templates.example.json`。

## 8. 用户纠错

- 桌宠菜单提供“刚才识别错了”。
- 用户可选择正确宏观类别；默认只保存分类差异和特征摘要。
- 用户可永久把某应用映射为工作、会议、摸鱼或忽略。
- 纠错只影响识别和本地个性化，不回改窝囊费账本。

## 9. 权限与降级等级

| 模式 | 信号 | 体验 |
|---|---|---|
| 基础本地 | 输入聚合 + 前台应用类别 | 可用，准确度中等 |
| 增强本地 | 加窗口/浏览器本地分类 | 更准确，不上传截图 |
| 高准确 | 加打码截图 + 在线视觉模型 | 最高准确度，需单独授权 |
| 手动 | 用户选择状态 | 所有自动识别关闭 |

用户拒绝截图权限时，产品仍必须可用。

## 10. 评估数据集

识别评估样例格式见 `datasets/activity-evaluation-sample.example.jsonl`。正式评估集应覆盖：

- 不同 Windows 缩放比例和多显示器；
- 暗色/亮色主题；
- 浏览器、IDE、Office、会议软件、视频站；
- 窗口并排和快速切换；
- 中英文 UI；
- 敏感页面应拒绝截屏的负样本；
- 用户真值、模型预测、信号缺失情况。

## 11. 验收条件

1. 输入监控日志中不存在键值、扫描码和鼠标坐标。
2. 未授权截图时不会调用在线视觉接口。
3. 截图处理后不落盘，服务端不保存图像。
4. 好友事件不包含应用名、标题、URL 或识别解释。
5. 键盘动作本地触发延迟 P95 ≤ 100ms。
6. 宏观分类离线评估 Macro-F1 达到发布门槛；目标先设 0.85，需数据验证。
7. 用户关闭识别后 1 秒内停止采集并广播 `IDLE/OFFLINE` 安全状态。
8. 模型不可用时自动降级，不阻断桌宠、任务和经济功能。

## 12. 待确认项

`[待确认: ACTIVITY-PRIVACY-001][阻塞]` 在线截图识别默认关闭，是否在首次引导主动询问。建议只在用户开启“高准确模式”时询问。  
`[待确认: ACTIVITY-001]` 多屏截取活动屏幕还是用户指定屏幕。建议活动窗口所在屏幕。  
`[待确认: ACTIVITY-002]` 浏览器类别通过扩展还是仅前台标题本地判断。建议 MVP 不要求扩展。  
`[待确认: ACTIVITY-003]` 原始窗口标题是否允许短暂进入本地内存规则。建议允许但默认不落盘。

## 13. 依赖

- Windows Electron 主进程；
- 桌宠动作、联机投影；
- 通知与隐私；
- 活动类别和安全文案数据集。

