# 07｜macOS 桌面活动识别

## 1. 目标

在用户明确授权下，结合 macOS 前台应用、键鼠活跃度、可选窗口上下文、可选浏览器信息和可选屏幕视觉识别，尽可能准确地判断用户当前处于写作、编码、开会、工作浏览、娱乐浏览、离开等宏观状态。

识别结果用于桌宠动作和无关痛痒的好友状态显示，不用于工资计提、绩效评价或自动修改任务。

## 2. 准确度取舍

- 已确认：准确度优先于在线视觉模型调用费用。
- 同时必须满足：逐级授权、最小化传输、原始内容不落盘、明确关闭入口。
- 本地信号已足够高置信时不必强制截图；这是减少隐私暴露，不是以省钱牺牲准确度。
- 若信号冲突或低置信，可调用在线视觉模型提高准确度。

## 3. 信号层级

| 信号 | 例子 | 默认 | 隐私级别 |
|---|---|---|---|
| 输入聚合 | 每秒键盘次数、鼠标移动/点击、空闲时长 | 用户启用后请求 Input Monitoring | `LOCAL_RAW` 聚合后立即丢弃细节 |
| 前台应用 | bundle identifier、代码签名身份或应用名映射到类别 | 启用活动识别后开启 | `LOCAL_DERIVED` |
| 窗口标题 | 经 Accessibility 授权后仅用于本地规则或本地模型 | 默认关闭 | `LOCAL_RAW` |
| 浏览器域名类别 | 工作/视频/社交等，不保留完整 URL | 可选 | `LOCAL_RAW` → 类别 |
| 屏幕截图视觉 | 经 Screen Recording 授权后获取、降采样并打码的当前屏幕 | 产品开关默认开启，等待系统授权 | `LOCAL_RAW`，默认不留存 |

不得采集具体按键、剪贴板内容、密码输入框内容、完整浏览历史或后台窗口正文。

## 4. 识别流水线

```text
macOS Signals
  → Local Feature Extractor
  → Sensitive-region Redaction
  → Local Rule / Model Classifier
  → Confidence & Conflict Gate
  → Optional Online Vision Classifier
  → Temporal Smoother
  → PrivateActivityObservation
  → Public Projection + Pet Action
```

### 4.1 macOS 采集边界

- 前台应用类别优先使用系统工作区的应用激活信息，不为读取进程正文申请高权限。
- 全局键鼠活动只消费事件类型与时间戳并立即聚合；若实现依赖原生事件监听，必须在功能启用时解释并请求 Input Monitoring。
- 精确窗口标题或窗口层级信息属于增强信号，只能在用户主动开启后请求 Accessibility；不得把 Accessibility 当作应用启动前置条件。
- 屏幕视觉识别产品开关默认开启；首次权限引导中解释打码、在线模型和无留存边界后请求 Screen Recording。系统权限未授予时不得采集、反复弹窗或绕过系统设置。
- Electron 主进程只通过平台适配接口暴露派生信号；React renderer 不得直接访问 macOS 原生 API、原始窗口列表或截图缓冲区。
- 权限撤销、系统限制、原生模块加载失败或签名不匹配时，采集器必须停止对应信号并发布可解释的降级状态。

### 4.2 本地特征

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

### 4.3 在线视觉请求

仅在产品开关开启、用户已完成系统授权且本地置信不足时产生：

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

- 多屏时只截取活动窗口所在显示器；无法可靠确定活动窗口时跳过截图，不截取所有屏幕。
- 截图进入内存后先做密码管理器、支付、系统安全界面黑名单检测。
- 可识别的通知横幅、菜单栏账号、Dock 缩略内容、邮箱地址等先模糊或遮盖。
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

## 8. 只读识别结果

- 用户可查看当前宏观类别、开始时间、持续时间和最近识别记录。
- 产品不提供“识别错了”、活动纠正、类别改写、备注反馈或历史回写入口。
- 用户可以暂停或关闭自动识别；暂停后停止采集，并向好友投影安全的不可用状态。
- 低置信或信号冲突时必须显示 `UNKNOWN/IDLE` 等中性状态，不要求用户代替模型纠正。

## 9. 权限与降级等级

| 模式 | 信号 | 体验 |
|---|---|---|
| 无权限降级 | 不采集系统桌面信号 | 任务、排程、经济和基础桌宠可用；活动状态显示 `UNKNOWN/IDLE` |
| 基础本地 | 前台应用类别 | 无截图，准确度有限 |
| 输入增强 | 加 Input Monitoring 输入聚合 | 拍键盘与离开判断更及时，不读取键值 |
| 上下文增强 | 加 Accessibility 窗口本地分类与可选浏览器类别 | 更准确，不上传截图 |
| 高准确 | 再加 Screen Recording、打码截图与在线视觉模型 | 最高准确度，每项权限独立授权 |

Accessibility、Input Monitoring 或 Screen Recording 任一权限被拒绝时，产品核心功能仍必须可用。设置页应显示当前权限状态、受影响能力和前往系统设置的入口；应用重新获得焦点或重启后必须重新读取系统状态，不能只相信本地开关。

## 10. 评估数据集

识别评估样例格式见 `datasets/activity-evaluation-sample.example.jsonl`。正式评估集应覆盖：

- Apple Silicon 真机、Retina 与非 Retina 外接屏、多显示器和不同显示缩放；
- Dock 位于底部/左侧/右侧以及自动隐藏；
- Spaces、全屏应用、Stage Manager、锁屏、睡眠与唤醒；
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
9. 主窗口、桌宠菜单和菜单栏中不存在活动纠正、类别改写或“刚才识别错了”入口。
10. 未获得 Input Monitoring 时不启动全局输入监听；未获得 Accessibility 时不读取增强窗口上下文；未获得 Screen Recording 时不获取屏幕像素。
11. 撤销任一 macOS 权限后，对应采集在 1 秒内停止，并在设置页显示真实系统状态。
12. 签名、公证后的发行构建与开发构建分别验证权限提示、重启恢复和原生模块加载，不以开发模式结果替代发行构建证据。

## 12. 已确认与待验证项

`[已确认: ACTIVITY-PRIVACY-001][2026-08-29]` 在线截图识别产品开关默认开启，首次权限引导主动说明并请求系统授权；未授权时无截图请求。
`[已确认: ACTIVITY-001][2026-08-29]` 多屏只截取活动窗口所在屏幕。
`[已确认: ACTIVITY-002][2026-08-29]` MVP 不要求浏览器扩展，仅使用获授权的本地上下文分类。
`[已确认: ACTIVITY-003][2026-08-29]` Accessibility 授权后，窗口标题可短暂进入本地内存规则，但不落盘、不上传。
`[待确认: PLATFORM-MIN-001][阻塞]` 工程锁定 Electron 版本后复核最低 macOS 版本；当前开发基线暂定 macOS 13。

## 13. 依赖

- macOS Electron 主进程、最小权限 preload 与平台适配层；
- 桌宠动作、联机投影；
- 通知与隐私；
- 活动类别和安全文案数据集。
