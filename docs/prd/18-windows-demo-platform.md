# 18｜Windows x64 Demo 平台

## 1. 目标

定义《不要加班》当前 Windows x64 可分享 Demo 的系统边界、窗口行为、隐私开关、凭据存储和交付证据，避免把“能在开发机运行”“能分享给项目成员”和“可公开发行”混为一谈。

## 2. 已确认的平台决定

| 项目 | 结论 |
|---|---|
| 当前开发平台 | Windows x64 |
| 当前交付形态 | 项目成员可直接运行的可分享 Demo |
| macOS | 暂停，不属于当前开发承诺 |
| 最低 Windows 版本 | Demo 阶段不做公开承诺；开发机与另一台 Windows 11 x64 优先验证 |
| 代码签名 | 当前不做，不是 Demo 门禁 |
| 安装器 | 当前不做；允许开发启动或解压后的目录产物 |
| 自动更新 | 当前不做 |
| 公开分发 | 当前不做；SmartScreen/Defender 提示属于已知限制 |

公开发行立项时，必须重新评估最低系统版本、签名证书、安装器、自动更新、病毒误报、隐私条款和干净机器安装，不得直接把本 Demo 标记为正式发行版。

## 3. 平台架构边界

```text
React / PixiJS Renderer
  → typed preload IPC
  → Electron Main Services
  → DesktopPlatform interface
      └─ Windows adapters
          ├─ tray and launch-at-login
          ├─ foreground application category
          ├─ aggregated input activity
          ├─ optional window context
          ├─ optional screen capture
          ├─ display workArea / DPI
          └─ DPAPI-backed Electron safeStorage
```

平台接口至少覆盖以下能力，但具体类型以 `packages/contracts` 为唯一事实源：

```ts
interface DesktopPlatform {
  getCapabilities(): Promise<DesktopCapabilitySnapshot>;
  getForegroundContext(): Promise<ForegroundContext>;
  startInputActivityMonitor(): Promise<StopHandle>;
  captureActiveDisplay(): Promise<RedactableFrame>;
  setLaunchAtLogin(enabled: boolean): Promise<void>;
  openSystemSettings(target: WindowsSettingsTarget): Promise<void>;
}
```

- renderer 不得直接调用 Win32、Node、Electron main 或任意字符串 IPC。
- preload 只暴露已冻结的类型化窄接口，不透传文件系统、shell、窗口句柄、原始窗口列表或截图缓冲区。
- 平台适配层把原生结果转换为共享契约；业务 domain 不依赖 Win32 结构、Electron 对象或原生事件。
- macOS 将来恢复时实现同一接口，不复制排程、经济、好友和渲染业务规则。

## 4. Windows 系统表面

Demo 包含三种系统表面：

1. 系统托盘：打开今日任务、显示/隐藏桌宠、通知静音、打开设置和退出应用；
2. 设置主窗口：登录、任务、排程、好友、商店、账号和隐私页面；
3. 透明桌宠窗口：无边框、可置顶、可切换点击穿透，依据当前显示器 `workArea` 定位。

必须处理：

- 主窗口关闭与“退出应用”语义不同；关闭主窗口后默认由托盘继续常驻；
- 任务栏自动隐藏、不同位置、单屏与多显示器；
- 100%/125%/150%/200% 缩放及混合 DPI 显示器间移动；
- 显示器热插拔、主显示器变化、锁屏、睡眠和唤醒；
- Windows 虚拟桌面、普通全屏、演示/视频/屏幕共享全屏；
- 透明窗口置顶、点击穿透和恢复交互必须有可退出路径，不能让用户失去控制。

## 5. 活动识别与隐私降级

Windows 没有与旧 macOS PRD 一一对应的统一权限矩阵，因此设置页必须区分“产品开关”和“真实运行能力”。

| 能力 | 默认 | 开启条件 | 不可用后的降级 |
|---|---|---|---|
| 前台应用类别 | 活动识别开启后 | 只读取分类所需的进程/应用身份 | `UNKNOWN/IDLE` |
| 全局输入聚合 | 关闭 | 单独说明并取得用户同意 | 不播放输入驱动动作 |
| 窗口上下文 | 关闭 | 单独说明；标题只短暂进入内存 | 只用应用类别 |
| 截图视觉识别 | 关闭 | 单独说明打码、在线模型和零留存 | 不获取屏幕像素、不调用视觉接口 |
| 系统通知 | 首次需要时 | 系统能力可用且用户未关闭 | 应用内提醒 |

共同规则：

- 输入钩子只记录事件类型、时间戳和聚合计数，不读取键值、扫描码、文本或鼠标坐标。
- 窗口标题、URL、截图和应用清单不得进入日志、SQLite、PostgreSQL、Sentry 或好友事件。
- 用户关闭功能后 1 秒内停止对应采集。
- 原生模块加载失败、系统 API 不可用或安全软件阻断时，发布可解释的能力状态，任务、排程、经济、好友和基础桌宠继续可用。
- 设置页不得把本地 `enabled=true` 显示成“能力正常”；重启和重新聚焦后重新探测。

## 6. 本机凭据与本地数据

- refresh token 只通过 Electron `safeStorage` 使用 Windows DPAPI 加密；禁止写入 localStorage、明文 SQLite、普通配置文件或日志。
- `safeStorage` 不可用时不得明文降级；允许当前会话继续，但持久化登录必须显示受限状态。
- PostgreSQL 是账号、任务、计划、好友和经济数据的权威来源。
- SQLite 只保留缓存、草稿和 outbox；正式余额、购买、好友授权和承诺状态不得以 SQLite 为最终来源。
- 本地数据库迁移必须向前兼容，破坏性变化先有过渡阶段。

## 7. Demo 交付形态

当前允许两种交付：

1. 已配置依赖的开发工作树，通过受控命令启动；
2. Electron 目录产物或压缩包，解压后运行。

每次可分享 Demo 至少记录：

```text
版本号
Git commit SHA
Node / npm / Electron 版本
Windows 版本与 CPU 架构
启动命令或入口文件
所需环境变量清单
后端/数据库依赖
文件 SHA-256
已验证与未验证范围
SmartScreen/Defender 已知限制
```

仓库和 Demo 中不得包含真实数据库密码、API Key、服务器私钥、用户截图、窗口标题或生产账号数据。

## 8. 当前非门禁

以下内容不进入 Windows Foundation 或可分享 Demo 的完成定义：

- Authenticode 代码签名；
- NSIS/MSIX/其他安装器；
- Windows Store；
- 自动更新、灰度和回滚；
- 公开下载站点；
- SmartScreen 应用信誉；
- 崩溃数据的正式合规上线。

这些非门禁不得被并行工作组“顺手实现”。需要时单独新增 PRD、凭据管理和验收流程。

## 9. 验收条件

1. Windows x64 开发机可启动主窗口，并可从托盘显示、隐藏和明确退出。
2. 透明桌宠按当前显示器 `workArea` 定位；任务栏自动隐藏和显示器变化后不会永久丢失在屏幕外。
3. 100%/125%/150%/200% 缩放下像素 UI 不模糊，点击区域与视觉位置一致。
4. 输入聚合、窗口上下文和截图识别分别可关闭；关闭后 1 秒内停止。
5. 原始键值、窗口标题、URL 和截图不出现在日志、数据库、错误上报或好友事件。
6. 任一识别能力不可用时，任务、排程、经济、好友和基础桌宠仍可使用。
7. refresh token 通过 `safeStorage` 加密；不可用时不明文降级。
8. Demo 记录 commit、环境、启动方式、哈希和已验证/未验证边界。
9. 至少在当前开发机完成关键路径；另一台 Windows 11 x64 的结果明确记录为已验证或未验证。
10. 未实现签名、安装器或自动更新时，文档和 UI 不得声称这是公开发行版本。

## 10. 待确认项

`[待确认: PLATFORM-WIN-001]` 公开分发前最低支持哪个 Windows 版本。当前不阻塞 Demo。
`[待确认: PET-WIN-001]` 关闭主窗口后是否托盘常驻、开机启动是否默认开启。建议托盘常驻，开机启动默认关闭。
`[待确认: PET-WIN-002]` 是否覆盖全屏应用。建议普通桌面显示，演示、视频和屏幕共享全屏时默认隐藏。
`[待确认: ACTIVITY-003]` 窗口标题是否允许短暂进入本地内存分类。建议用户单独开启后允许，永不落盘。

## 11. 依赖

- Electron main、preload IPC 与 Windows 平台适配层；
- 桌面活动识别与通知隐私；
- 桌宠动作与 PixiJS 渲染；
- 账号安全存储；
- Windows Foundation 环境、契约、数据库和验收规范。
