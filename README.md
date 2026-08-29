# No Overtime Pet（不要加班）

一款面向 macOS 的像素风联机工作桌宠：用户录入任务名称、DDL 和重要性，系统分析任务类型、预计时长与认知负荷，生成当天可调整的工作安排，帮助用户完成承诺任务并准点下班。

工作时，像素角色根据获得授权的输入活跃度、前台应用、会议和可选视觉识别播放动作；互加好友后，用户可以在“排排坐工作”界面看到彼此的泛化状态与同步动作。

> 当前阶段：PRD、技术方案、UI 方向稿与动作资源原型；尚无可运行产品工程。

## 当前平台决定

- MVP 开发与首发平台：macOS；
- 首版正式支持：Apple Silicon `arm64`；
- 分发方式：官网 DMG，使用 Developer ID 签名并经 Apple 公证；
- Mac App Store：不进入 MVP；
- Windows：延后，不属于当前发布承诺。
- 首发区域：仅中国大陆；业务日期和奖励池固定使用北京时间 `Asia/Shanghai`。

## 核心机制

```text
录入任务 ──> AI 建议（类型/时长/负荷）──> 用户确认排程 ──> 工作中桌宠动作
                                                             │
   好友排排坐（仅泛化状态）<─────────────────────────────────┘
                                                             │
   准点跑路 ──> 窝囊费结算 ──> 商店买角色/叠帽子 <──────────┘
```

- **用户高于 AI**：AI 只提供建议，用户锁定、排序和修改始终优先。
- **窝囊费**：用户感知中的唯一货币，按用户填写的人民币日薪与工时换算。
- **加班奖励池**：加班扣减及结算时仍断线用户的当日所得按人民币原额入池，分配给完成承诺并准点下班的合格用户。
- **连接计提**：只有 App 打开且已连接时记录；结算前重连恢复资格，结算时仍断线则当日所得转池。
- **动作资源**：正式角色动作固定为 128×128 透明 GIF，状态机按 `PetAction` 切换。
- **隐私收敛**：好友只看到泛化状态；不传截图、按键值、窗口标题、任务正文或日薪。
- **权限可降级**：拒绝 Input Monitoring、Accessibility 或 Screen Recording 不会阻断任务、排程、经济和基础桌宠。

## 计划技术栈

- Electron + React + TypeScript + Vite；
- PixiJS、Zustand、TanStack Query、SQLite；
- NestJS + PostgreSQL + Socket.IO + Redis；
- Python FastAPI AI 服务；
- Vitest、React Testing Library、Playwright Electron。

## 目录结构

```text
AGENTS.md                         仓库级协作入口
不要加班_agent.md                 项目规则与当前平台决定
lessons.md                        返工、问题原因与防止规则
development_progress.md            当前周目标、Todo、验证与状态
不要加班_组合式PRD_v2.0.md        当前 PRD 入口
docs/prd/                         模块 PRD、接口、验收和数据集
design/image2-ui-v1/              第一版 UI 方向稿，含历史 Windows 系统场景
design/image2-ui-v2-comments/      UI 评审修订稿
design/pet-action-prototypes/      桌宠动作与前景特效资源原型
```

## 阅读顺序

1. `AGENTS.md`；
2. `不要加班_agent.md`；
3. `lessons.md`；
4. `不要加班_组合式PRD_v2.0.md`；
5. `docs/prd/README.md`、产品总览、共享契约及当前模块 PRD。

macOS 系统能力、权限、签名、公证、DMG 和自动更新要求见 `docs/prd/18-macos-platform-distribution.md`。

## 说明

- 现有带 Windows 桌面、任务栏或系统托盘的图片是历史视觉方向稿，不是当前 macOS 集成验收证据。
- `docs/prd/datasets/` 中均为结构示例，不能直接作为生产配置。
- Bongo Cat 只作为“输入映射为角色动作”的机制参考，不复制其角色、美术、品牌或代码。
- 发行证书、私钥、公证凭据、API Key 和 `.env` 文件禁止提交到仓库。
