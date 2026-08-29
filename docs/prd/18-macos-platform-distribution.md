# 18｜macOS 平台与发行

## 1. 目标

定义《不要加班》MVP 的 macOS 系统边界、窗口行为、权限接入、构建产物、签名、公证、安装和更新要求，确保“开发机可以运行”与“普通用户可以安全安装”不会被混为一谈。

## 2. 已确认的平台决定

| 项目 | 结论 |
|---|---|
| MVP 开发与首发平台 | macOS |
| 正式支持架构 | Apple Silicon `arm64` |
| Intel Mac | MVP 不承诺；后续按用户需求与原生依赖成本评估 |
| 开发系统基线 | 暂定 macOS 13；工程锁定 Electron 版本后复核 |
| 首发渠道 | 官网直接下载 DMG |
| 发行身份 | Apple Developer Program 的 Developer ID Application |
| 发布要求 | Hardened Runtime、完整签名、Apple 公证、票据 stapling 与 Gatekeeper 验证 |
| Mac App Store | 不进入 MVP |
| Windows | 延后，不属于本版发布承诺；共享业务层保留未来适配边界 |

最低系统版本不是仅由产品偏好决定。工程初始化时必须同时核对锁定 Electron 版本、Node 原生依赖、截图方案和 Apple 当前公证要求，再确认 `PLATFORM-MIN-001`。

## 3. 平台架构边界

```text
React / PixiJS Renderer
  → typed preload IPC
  → Electron Main Services
  → Platform Interfaces
      └─ macOS adapters
          ├─ application activity
          ├─ input activity
          ├─ screen capture
          ├─ permission status
          ├─ window/menu bar/login item
          └─ Keychain-backed safe storage
```

平台接口至少覆盖：

```ts
interface DesktopPlatform {
  getForegroundContext(): Promise<ForegroundContext>;
  startInputActivityMonitor(): Promise<StopHandle>;
  getPermissionStatus(kind: MacPermission): Promise<PermissionStatus>;
  openPermissionSettings(kind: MacPermission): Promise<void>;
  captureActiveDisplay(): Promise<RedactableFrame>;
  setLaunchAtLogin(enabled: boolean): Promise<void>;
}
```

- renderer 不得直接调用 Node、Electron 主进程或 macOS 原生 API。
- preload 只暴露当前产品需要的窄接口，不透传任意 IPC、文件路径、窗口句柄或截图缓冲区。
- 业务层只消费派生后的类别、权限状态和动作意图，不依赖 bundle identifier、Accessibility 对象或原生事件结构。
- Windows 未来实现同一接口时，不得复制排程、经济、好友和渲染业务代码。

## 4. macOS 窗口与常驻形态

MVP 包含三种系统表面：

1. 菜单栏图标：持续提供打开今日任务、显示/隐藏桌宠、通知静音、打开设置和退出应用；
2. 设置主窗口：承载登录、任务、排程、好友、商店、账号和权限页面；
3. 透明桌宠窗口：无边框、可置顶、可切换点击穿透，按当前显示器 `workArea` 定位。

必须处理：

- Dock 位于底部、左侧、右侧或自动隐藏；
- 内建屏与外接屏之间移动、主显示器变化、拔插显示器；
- Retina 与非 Retina 显示器的设备像素比变化；
- Spaces 切换、Mission Control、全屏应用和 Stage Manager；
- 睡眠、唤醒、锁屏、快速用户切换和系统关机；
- 关闭主窗口后应用继续由菜单栏常驻，只有明确“退出应用”才结束后台服务。

桌宠在全屏应用中的可见性与仅菜单栏模式下的 Dock 图标行为分别由 `PET-MAC-002`、`PET-MAC-001` 决定，开发者不得自行选择。

## 5. 权限矩阵

| 能力 | macOS 权限 | 默认 | 拒绝后的降级 |
|---|---|---|---|
| 前台应用类别 | 优先使用低权限系统工作区信息 | 用户启用活动识别后 | 显示 `UNKNOWN/IDLE` |
| 全局键鼠活跃度 | Input Monitoring | 关闭 | 不播放输入驱动动作，不影响其他桌宠动作 |
| 增强窗口上下文 | Accessibility | 关闭 | 只使用前台应用类别 |
| 屏幕视觉识别 | Screen Recording | 关闭 | 不获取屏幕像素，不调用视觉接口 |
| 系统提醒 | Notifications | 首次需要时请求 | 使用应用内提醒 |
| refresh token 加密 | Keychain，经 Electron `safeStorage` | 登录后使用 | 安全存储不可用时不得明文降级 |

权限要求：

- 每项权限按功能触发，禁止首次启动一次性索取全部权限。
- 产品开关与系统授权状态分别存储、分别展示。
- 应用只能说明原因并引导用户前往系统设置，不能伪造、绕过或循环强迫授权。
- 权限撤销后立即停止对应采集；重新聚焦或重启时重新读取系统状态。
- 开发构建和发行构建的权限记录、bundle identifier 与签名身份可能不同，二者必须分别测试。

## 6. 构建产物

MVP 发布集合至少包含：

```text
不要加班-{version}-arm64.dmg
不要加班-{version}-arm64.zip
更新元数据文件
SHA-256 校验值
发布说明
```

- DMG 用于官网首次安装。
- ZIP 与更新元数据用于自动更新；具体格式在选定 Electron 更新方案后冻结。
- 所有可执行文件、Electron Helper、原生模块和嵌套框架必须由同一发行身份正确签名。
- 应用 bundle identifier 一经首次公开测试即视为稳定接口；随意修改会影响 Keychain、权限记录、登录项和更新连续性。
- 原生依赖必须针对锁定的 Electron ABI 与 `arm64` 构建，不得把本地偶然可加载的未签名二进制打入发行包。

## 7. 签名、公证与发布流水线

发布顺序固定为：

```text
clean install
  → lint / typecheck / unit / integration / Electron E2E
  → arm64 package
  → sign nested code and app bundle
  → verify code signature and entitlements
  → notarize
  → staple ticket
  → verify Gatekeeper assessment
  → build/finalize DMG and update ZIP
  → install smoke test on clean Apple Silicon Mac
  → publish artifacts and update metadata
  → staged update observation
```

- Apple 账号、Developer ID 证书、私钥、公证凭据和更新发布凭据只能保存在受控密钥库或 CI secret 中，不进入仓库、日志或构建产物。
- 公证成功不替代功能测试；签名通过也不证明 Accessibility、Input Monitoring、Screen Recording 或登录项在发行构建中可用。
- 未签名、ad-hoc 签名或未公证构建只能用于受控开发，不得标记为公开发行版本。
- 首次正式发布前必须在未安装过本产品、未预授予权限的干净用户环境完成整条安装与权限引导。

## 8. 自动更新与回滚

- macOS 自动更新只接受由当前信任发行身份签名的版本。
- 更新元数据必须通过 HTTPS 获取，并具有版本、架构、文件校验值和发布时间。
- 更新前保留用户 SQLite 与必要配置；失败后不得清空任务、设置或离线队列。
- 灰度发布时，服务端契约需向前兼容至少一个已发布客户端版本。
- 更新后必须复测 Keychain、登录项、系统权限状态、菜单栏和透明窗口，避免签名或 bundle identity 变化导致权限重新申请。
- 回滚不得降级数据库到旧版本无法读取的 Schema；破坏性迁移必须先有兼容阶段。

## 9. 视觉稿迁移规则

- 现有像素角色、任务卡片、气泡、按钮、商店和排排坐视觉语言继续使用。
- 现有带 Windows 桌面、任务栏或系统托盘的展示图只作为历史方向稿，不能作为 macOS 系统集成验收图。
- 新增 macOS 视觉稿应覆盖菜单栏入口、Dock 四种状态、权限引导、Retina/外接屏、Spaces 和 Stage Manager。
- 设置主窗口遵循 macOS 窗口预期；透明桌宠和像素气泡保持产品自有视觉，不强行仿制原生控件。

## 10. 验收条件

1. 在干净 Apple Silicon Mac 上从 DMG 安装，不需要终端命令、关闭 Gatekeeper 或手工移除 quarantine。
2. 应用、Helper、框架和原生模块签名验证通过，公证成功且票据已 stapled。
3. Gatekeeper 能识别开发者身份，首次启动没有“开发者无法验证”或“应用已损坏”错误。
4. 菜单栏常驻、主窗口、透明桌宠、登录项和退出行为符合产品定义。
5. Input Monitoring、Accessibility、Screen Recording、Notifications 分别覆盖未询问、允许、拒绝、撤销和系统限制状态。
6. 任一高权限被拒绝时，任务、排程、窝囊费、好友和基础桌宠仍可使用。
7. 更新前后账号会话、Keychain、SQLite、权限状态和登录项保持连续；更新失败可安全恢复。
8. Retina/非 Retina、多显示器、Dock 位置、Spaces、全屏和 Stage Manager 通过真实环境检查。
9. 发行流水线不输出证书私钥、公证凭据、token、截图或窗口标题。
10. 发布报告记录版本、commit、Electron 版本、macOS 版本、芯片、签名身份摘要、公证结果、产物哈希和测试证据位置。

## 11. 待确认项

`[待确认: PLATFORM-MIN-001][阻塞]` 工程锁定 Electron 与原生依赖版本后，确认最低支持 macOS 版本；开发基线暂定 macOS 13。  
`[待确认: PLATFORM-UPDATE-001]` 自动更新文件托管与灰度策略。建议使用现有 S3 兼容对象存储，支持分阶段发布和快速撤回更新元数据。  
`[待确认: PET-MAC-001]` 设置主窗口关闭后是否隐藏 Dock 图标。建议仅菜单栏与桌宠运行时隐藏，打开设置时恢复。  
`[待确认: PET-MAC-002]` 是否覆盖全屏应用。建议全屏演示、视频和屏幕共享时默认隐藏。

## 12. 依赖

- Electron 壳、preload IPC 与平台适配层；
- 桌面活动识别；
- 桌宠动作与 PixiJS 渲染；
- 通知、权限与隐私；
- 账号安全存储；
- 测试与验收、开发路线和发布基础设施。
