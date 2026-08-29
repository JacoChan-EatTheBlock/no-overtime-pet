# 08｜桌宠动作系统

## 1. 目标

用低延迟像素动画把用户真实工作状态转成桌宠动作；键盘输入时呈现类似 Bongo Cat 的拍键盘机制，并让好友看到同类聚合动作。

## 2. 版权与实现边界

“类似 Bongo Cat”仅指交互机制：输入触发左右手拍键盘。不得直接复制其角色形象、品牌、音效、动画帧或未经许可的代码。角色、键盘和动作必须使用本项目原创或已获授权资产。

## 3. 动作状态机

动作分为三层优先级：

```text
一次性动作：CELEBRATE
短动作：TYPE_LEFT / TYPE_RIGHT / TYPE_BOTH / MOUSE_CLICK
持续动作：MEETING_DAZE / READ / SLACK_SECRETLY / IDLE / AWAY_DISAPPEAR
```

优先级建议：

1. 关键一次性动作播放到不可中断点；
2. 本地输入短动作可打断普通持续动作；
3. `AWAY_DISAPPEAR` 覆盖所有普通动作；
4. 无有效状态回到 `IDLE`。

## 4. 输入到动作映射

```ts
interface PetActionIntent {
  action: PetAction;
  intensity: 1 | 2 | 3;
  triggeredAt: UTCTimestamp;
  minimumPlayMs: DurationMs;
  source: "LOCAL_INPUT" | "ACTIVITY_CLASSIFIER" | "SYSTEM_EVENT" | "REMOTE_PROJECTION";
}
```

### 4.1 拍键盘

- 每次按键只在本地内存触发手部选择，不读取字符。
- 左右手可按伪随机或交替算法选择，不映射真实键位，防止旁观推断输入内容。
- 高频输入时合并为连续敲击循环；不为每个键创建网络事件。
- 300ms 内多次输入可提升 `intensity`，切换更快循环。
- 本地动作目标延迟 P95 ≤ 100ms。

### 4.2 其他映射

| 信号 | 动作 |
|---|---|
| 鼠标连续移动 | `MOUSE_MOVE` |
| 鼠标点击聚合 | `MOUSE_CLICK` |
| 会议状态 | `MEETING_DAZE`，戴耳机发呆 |
| 阅读/工作浏览 | `READ` |
| 娱乐浏览/视频 | `SLACK_SECRETLY` |
| 离开 | `AWAY_DISAPPEAR` |
| 完成最后承诺任务且准点跑路 | `CELEBRATE` |

## 5. 动画资源契约

每个角色必须支持最小动作集：

```text
IDLE, TYPE_LEFT, TYPE_RIGHT, TYPE_BOTH,
MOUSE_MOVE, MOUSE_CLICK, MEETING_DAZE,
READ, SLACK_SECRETLY, AWAY_DISAPPEAR, CELEBRATE
```

若角色缺动作：

```text
指定动作 → 同族 fallbackAction → IDLE
```

动画由 Sprite Sheet/WebP Sheet + Manifest 描述。运行时不生成动画，也不依赖 GIF 解码作为正式播放方式。详细格式见 `11-asset-pipeline-contract.md`。

## 6. 渲染与像素风约束

- 使用整数倍缩放与 nearest-neighbor 采样；
- 逻辑画布和角色锚点固定，避免动作切换时脚底漂移；
- Windows 100%、125%、150%、200% 缩放下像素边缘不模糊；
- 默认帧率可为 12–24fps，按资源 Manifest；
- 透明桌宠窗口点击穿透策略可切换，设置或拖动时暂时接收点击；
- GPU 不可用时降级 Canvas 或静态帧，不阻断任务功能。

## 7. 联机动作摘要

本地高频动作经 1 秒窗口聚合：

```ts
interface ActionAggregate {
  windowStart: UTCTimestamp;
  windowEnd: UTCTimestamp;
  dominantAction: PetAction;
  intensity: 1 | 2 | 3;
  sequence: number;
}
```

只发送主动作和强度。好友客户端用同一动作包自行播放，不发送每一帧、每次按键或输入频率精确值。

## 8. 帽子叠加渲染

- 角色 Manifest 暴露头部锚点；每顶帽子暴露底部连接锚点和顶部叠加锚点。
- 第 1 顶帽子底锚点对齐角色头锚点；第 N 顶底锚点对齐第 N-1 顶顶部锚点。
- 渲染顺序：角色后层 → 角色 → 帽子从低到高 → 前景特效。
- 帽子堆叠超出窗口时，场景应自动缩放或提供纵向滚动视口，不能改变装备数据。
- 帽子玩法不设置固定装备硬上限；静止帽子层可合成为缓存纹理，动作变化时只更新角色锚点与合成层位置。
- 不得因视口或性能限制静默丢弃数组顶部或底部的帽子。

## 9. 性能预算

| 项目 | 目标 |
|---|---|
| 本地输入到动作 P95 | ≤ 100ms |
| 单角色渲染平均 CPU | 主流办公机空闲时尽量 < 3% |
| 单角色显存/纹理预算 | 由资产包等级配置，MVP 建议 ≤ 32MB |
| 12 名好友同时渲染 | 保持 ≥ 30fps |
| 隐藏/最小化 | 降到低帧率或暂停渲染 |

## 10. 验收条件

1. 任意键盘输入可触发拍键盘，但日志和网络包无法还原按键。
2. 高频输入合并为动画循环，不创建事件风暴。
3. 好友能在 3 秒内看到对应敲键盘动作。
4. 缺少某动作资产时安全降级至 fallback 或 `IDLE`。
5. 切动作时角色脚底锚点不明显跳动。
6. 帽子按正确锚点逐层叠高，顺序稳定；超高帽子塔不会丢层。
7. 125% 和 150% Windows 缩放下仍保持像素清晰。

## 11. 待确认项

`[待确认: PET-001]` 桌宠是独立透明悬浮窗、主窗口内，还是两者都有。建议两者都有，MVP 先透明桌宠 + 设置主窗。  
`[待确认: PET-002]` 是否需要拍键盘音效。建议默认关闭，可单独开启。  
`[待确认: HAT-STACK-001]` 超高帽子塔的自动缩放下限、滚动方式与静态层缓存阈值。建议不限制装备数量，在低于可读缩放后改用滚动视口。

## 12. 依赖

- 活动识别；
- 实时联机；
- 资产管线契约；
- 商店装备状态。
