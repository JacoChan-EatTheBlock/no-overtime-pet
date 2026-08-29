# No Overtime Pet（不要加班）

一款面向 Windows x64 的像素风联机工作桌宠：用户录入任务名称、DDL 和重要性，系统分析任务类型、预计时长与认知负荷，生成当天可调整的工作安排，帮助用户完成承诺任务并准点下班。

工作时，像素角色根据获得授权的输入活跃度、前台应用、会议和可选视觉识别播放动作；互加好友后，用户可以在“排排坐工作”界面看到彼此的泛化状态与同步动作。

> 当前阶段：Windows 可分享 Demo 基座、PRD、UI 还原与动作资源原型并行建设；尚未形成完整业务闭环。

## 当前平台决定

- 当前开发平台：Windows x64；
- 当前交付目标：可由项目成员直接解压或运行开发构建的可分享 Demo；
- 当前不做：公开发行、代码签名、安装器、自动更新和 SmartScreen 信誉建设；
- macOS：暂停，不属于当前开发承诺；
- Windows 系统表面由 Electron main/preload/platform 适配层实现，产品自有像素 UI 不改成系统原生视觉。

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
- **加班奖励池**：加班扣减按人民币原额入池，分配给完成承诺并准点下班的合格用户。
- **隐私收敛**：好友只看到泛化状态；不传截图、按键值、窗口标题、任务正文或日薪。
- **能力可降级**：输入聚合、窗口上下文或截图识别被关闭、不可用或被安全软件阻断时，不会阻断任务、排程、经济和基础桌宠。

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
不要加班_组合式PRD_v2.0.md        当前 PRD 入口
docs/prd/                         模块 PRD、接口、验收和数据集
design/image2-ui-v1/              第一版 UI 方向稿；系统桌面只作展示环境参考
design/image2-ui-v2-comments/      UI 评审修订稿
design/pet-action-prototypes/      桌宠动作与前景特效资源原型
```

## 阅读顺序

1. `AGENTS.md`；
2. `不要加班_agent.md`；
3. `lessons.md`；
4. `不要加班_组合式PRD_v2.0.md`；
5. `docs/prd/README.md`、产品总览、共享契约及当前模块 PRD。

Windows 系统能力、隐私降级和 Demo 交付边界见 `docs/prd/18-windows-demo-platform.md`；并行开发基座见 `docs/development/WINDOWS_FOUNDATION_SPEC.md`。

## 说明

- 现有带 Windows 桌面、任务栏或系统托盘的图片只用于理解展示环境；renderer 不得模拟系统桌面、任务栏或托盘来冒充产品能力。
- `docs/prd/datasets/` 中均为结构示例，不能直接作为生产配置。
- Bongo Cat 只作为“输入映射为角色动作”的机制参考，不复制其角色、美术、品牌或代码。
- 证书、私钥、API Key、数据库口令和本地 `.env` 文件禁止提交到仓库。
