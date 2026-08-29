# 「不要加班」系统架构与团队分工

> 基于 `codex/macos-prd-v2` 分支 PRD v2.0  
> 目标平台：macOS（Apple Silicon arm64 优先）  
> 产品形态：像素风联机工作桌宠  
> 最后更新：2026-08-29

---

## 一、系统架构总览

```
┌──────────────────────────────────────────────────────────────────────┐
│                         macOS Desktop (Electron)                      │
│  ┌───────────┐  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │  Main     │  │    Renderer          │  │  Preload (IPC)       │  │
│  │  Process  │  │  ┌────────────────┐  │  │  最小权限桥接         │  │
│  │           │  │  │ React + Vite   │  │  └──────────────────────┘  │
│  │ platform/ │  │  │ 设置/待办/日程  │  │                           │
│  │  macos/   │  │  │ 好友/商店 UI   │  │                           │
│  │           │  │  ├────────────────┤  │                           │
│  │ 输入聚合  │  │  │ PixiJS 渲染层  │  │                           │
│  │ 截图识别  │  │  │ 桌宠/排排坐    │  │                           │
│  │ 权限管理  │  │  │ 帽子叠加       │  │                           │
│  └───────────┘  │  └────────────────┘  │                           │
│                  │  Zustand + TanStack  │                           │
│                  └──────────────────────┘                           │
│                                                                      │
│  ┌──────────────────────┐                                           │
│  │  SQLite (本地缓存)    │  离线队列 · 设置缓存 · 活动特征窗口      │
│  └──────────────────────┘                                           │
└──────────────────────────────────────────────────────────────────────┘
           │ HTTPS                            │ WebSocket
           ▼                                  ▼
┌─────────────────────────┐    ┌──────────────────────────┐
│   NestJS API Server     │    │  Realtime Gateway        │
│                         │    │  (Socket.IO + Redis)     │
│  Identity · Social      │    │                          │
│  Tasks · Scheduling     │    │  presence · pet.action   │
│  Economy · Commerce     │    │  appearance              │
│  Workday · Privacy      │    │                          │
│                         │    └──────────────────────────┘
│  ┌─────────────────┐   │                │
│  │  PostgreSQL     │   │                │
│  │  (权威数据源)   │   │    ┌───────────┴───────────┐
│  └─────────────────┘   │    │        Redis          │
│                         │    │  缓存 · 限流 · 在线  │
└─────────────────────────┘    └───────────────────────┘
           │ Internal HTTP
           ▼
┌─────────────────────────────────┐
│   Python FastAPI (AI Service)   │
│                                 │
│   任务分析 · 时间估计 · 排程    │
│   视觉分类 · 评估入口           │
│                                 │
│   可替换在线模型 Provider       │
└─────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   S3 兼容对象存储               │
│   角色/帽子/动作包资源          │
└─────────────────────────────────┘
```

---

## 二、Monorepo 目录结构

```
no-overtime-pet/
├── apps/
│   ├── desktop/              ← Electron 桌面端
│   │   ├── main/             Electron 主进程
│   │   │   └── platform/     macOS 平台适配层
│   │   ├── preload/          最小权限 IPC Bridge
│   │   └── renderer/         React + PixiJS 渲染
│   ├── api/                  ← NestJS 后端 API
│   ├── realtime/             ← Socket.IO 实时网关
│   └── ai-service/           ← FastAPI AI 服务
│
├── packages/
│   ├── contracts/            共享类型·枚举·JSON Schema
│   ├── domain/               纯业务规则（排程·经济公式）
│   ├── asset-runtime/        Manifest 校验 + PixiJS 适配
│   └── test-fixtures/        脱敏测试数据
│
├── assets/
│   ├── characters/           预制角色运行时资产
│   ├── hats/                 帽子 + 锚点元数据
│   └── manifests/            动作包 Manifest
│
├── docs/prd/                 PRD 文档合集
└── tests/                    跨模块 E2E 测试
```

---

## 三、模块拆解 & 团队分工

### 工作包一览（可并行）

| # | 工作包 | 职责范围 | 技术栈 | 建议人数 |
|---|--------|----------|--------|----------|
| 1 | **Desktop Shell** | Electron 壳、macOS 菜单栏、透明窗口、签名/公证/DMG、权限管理、登录项 | Electron + TS + macOS API | 1–2 |
| 2 | **UI / 前端** | React 设置/待办/日程/好友/商店页面、状态管理、离线队列 | React + TS + Vite + Zustand + TanStack Query + SQLite | 2–3 |
| 3 | **PixiJS 渲染 / 桌宠** | 像素角色动作、帽子叠加、排排坐场景、Sprite Sheet 渲染 | PixiJS + TS | 1–2 |
| 4 | **服务端核心** | 账号·好友·任务·日程·工作日·API 骨架·幂等·事务 | NestJS + TS + PostgreSQL | 2–3 |
| 5 | **经济系统** | 窝囊费计提·钱包账本·商店·购买·加班奖励池结算 | NestJS + TS + PostgreSQL | 1–2 |
| 6 | **实时服务** | WebSocket 网关、presence、动作广播、限流 | NestJS + Socket.IO + Redis | 1 |
| 7 | **AI 服务** | 任务分析·时长估计·排程求解·视觉分类·模型适配 | Python + FastAPI | 1–2 |
| 8 | **桌面活动识别** | macOS 前台应用/输入/截图/在线视觉模型组合、隐私降级 | Electron Main + Swift/ObjC 桥接 | 1–2 |
| 9 | **美术/资产管线** | 离线像素动画生成、角色/帽子/动作包、Manifest 验收 | Aseprite + Python + FFmpeg + Pillow | 1 (美术) |
| 10 | **QA / 测试** | 契约测试·E2E·隐私扫描·性能·Apple Silicon 安装验证 | Vitest + Playwright Electron | 1 |

---

## 四、各工作包详细说明

### 1. Desktop Shell（macOS 平台）

**核心交付：**
- Electron arm64 壳 + Vite 构建
- macOS 菜单栏常驻入口
- 透明桌宠窗口（适配 Dock 位置、Spaces、Stage Manager、全屏应用）
- 系统权限请求：Accessibility / Input Monitoring / Screen Recording
- 权限被拒时安全降级（不阻断核心功能）
- Developer ID 签名 → Apple 公证 → DMG 打包 → 自动更新
- 登录项（Login Item）
- 最小权限 Preload Bridge

**关键约束：**
- 最低 macOS 13，正式支持 Apple Silicon
- 业务代码禁止直接调用原生 API，统一通过 `main/platform/macos` 适配层
- Hardened Runtime + notarization 全流程验证

---

### 2. UI / 前端

**核心交付：**
- 设置页：工时/午休/日薪
- 待办录入页 → 自动触发 AI 建议确认页（主操作文案"确认建议"）
- 日程视图：时间块排列、锁定/拖拽
- 好友列表 + 好友码申请/接受
- 商店页 + 库存 + 装扮
- 账号页：注册/登录（仅用户名+密码）、修改资料、退出、删除账号
- 隐私设置页：两个独立开关
- Zustand 本地状态 + TanStack Query 服务端状态
- SQLite 离线命令队列 + 缓存

**关键约束：**
- 任务列表无逐条"AI分析"按钮
- 活动识别只读，无纠正入口
- 好友可见性使用两个独立设置（广播 vs 桌面显示）
- "不对其展示"只停止单向投影，保留好友关系

---

### 3. PixiJS 渲染 / 桌宠

**核心交付：**
- 像素角色基础动作状态机（IDLE → 打字 → 会议 → 摸鱼疑似 → 离开 → 跑路等）
- 键盘输入 → 低延迟 Bongo Cat 式拍键盘动作
- 帽子叠加渲染（锚点+偏移，无固定上限，自动缩放/滚动/缓存）
- 排排坐场景：横向排列、自动换行/分页
- 好友角色 + 帽子同步显示
- 登录页"金币砸脑壳"循环装饰动画
- Sprite Sheet 最近邻缩放（禁止模糊插值）
- GIF 仅评审用，运行时使用透明 Sprite Sheet + Manifest

**关键约束：**
- 帽子叠放使用资产元数据锚点，不运行时猜测
- 像素资产整数倍缩放
- 12 好友角色场景性能达标

---

### 4. 服务端核心

**核心交付：**
- 用户注册/登录（用户名+密码，无邮箱/手机/验证码）
- 好友系统（好友码、申请/接受/删除、单向"不对其展示"、无拉黑）
- 任务 CRUD + 软删除 + revision 乐观锁
- AI Proposal 接受/拒绝流程（确定性组装）
- 日程 Draft → Confirm → Replan
- 承诺快照 + 审计型取消
- 工作日会话（start/clock-out）
- 通用 API 规范（幂等键、版本锁、错误码、限流）
- 数据库迁移框架

**关键约束：**
- 经济、权限、好友授权在服务端做权威校验
- 正式状态/余额必须由确定性代码+事务控制
- 服务端时间决定计提、跑路和结算

---

### 5. 经济系统

**核心交付：**
- 窝囊费计提（工作时段累加、午休暂停、加班倒扣）
- 不可变账本（nang_fee_ledger）+ 钱包快照
- 购买力守恒：商品按"价格窝囊时长"定价 × 用户费率显示
- 加班奖励池：人民币原额入池 → 按人民币分均分 → 按收款人费率固化
- 购买：原子扣减 + 幂等
- 工资变更时余额与商品价格同比重算
- 池结算守恒校验（差异精确为 0）

**关键约束：**
- 后台归一化毫秒记账，但不向用户展示第二个"窝囊时长钱包"
- 禁止浮点数参与守恒校验
- 高薪用户加班贡献更多人民币给池，低薪获奖者获得更高购买力（预期福利）

---

### 6. 实时服务

**核心交付：**
- Socket.IO 网关 + Redis pub/sub
- presence.updated / pet.action.updated / appearance.updated 事件
- 房间管理（好友可见范围）
- 聚合动作广播（不逐次发送每个键盘事件）
- 客户端+网关双重限流（每用户每秒最多 1 条动作更新）
- 断线重连 → presence.snapshot 恢复
- 事件 Schema 隐私字段 denylist

---

### 7. AI 服务

**核心交付：**
- 任务分析 Proposal（类型/时长/认知负荷/可拆分性）
- 个人历史聚合特征 + 可解释时间估计
- 确定性排程求解器 + 重排 Diff
- 视觉分类适配（截图 → 泛化活动类型）
- 可替换在线模型 Provider 层
- AI 失败降级（不阻断核心流程）
- 固定评估集 + 准确率报告

**关键约束：**
- AI 只出建议，不直接写 Task 正式字段
- 用户锁定/排序/时长永远覆盖 AI
- 结构化输出，不保存原始思维链
- 敏感内容最小化（只传必要上下文）

---

### 8. 桌面活动识别（macOS）

**核心交付：**
- 前台应用名 + Bundle ID
- 输入活动聚合（只用事件类型+时间，不记录具体按键）
- 窗口上下文（可选，需单独授权）
- 截图 + 模糊化 + 在线视觉模型
- 本地分类 + 时间平滑
- 权限（Accessibility / Input Monitoring / Screen Recording）独立处理
- 权限撤销后即时降级
- 识别结果只读，无纠正入口

**关键约束：**
- 准确度优先于模型调用成本
- 不传输原始截图/具体按键/窗口标题/URL 给好友
- "摸鱼"标签需更高置信度+持续时间门槛
- 可能需要原生二进制模块（验证 Electron ABI + Hardened Runtime 兼容）

---

### 9. 美术 / 资产管线

**核心交付：**
- 预制角色像素动画（多角色 × 多动作）
- 帽子资产 + 锚点元数据
- 动作包 Manifest（JSON Schema 校验）
- 金币砸脑壳装饰动画素材
- Sprite Sheet / WebP Sheet 导出
- 资产 QA 自动校验脚本

**关键约束：**
- 动画管线离线执行，不进入产品运行时
- 运行时使用标准 Sprite Sheet + Manifest，不用 GIF
- 像素整数倍，禁止模糊插值
- Bongo Cat 只作机制参考，不复制其角色/美术

---

### 10. QA / 测试

**核心交付：**
- 契约测试（contracts 包对齐所有模块）
- 单元测试（Vitest）
- 组件测试（React Testing Library）
- E2E 测试（Playwright Electron）
- 经济守恒校验自动化
- 隐私字段扫描（事件/日志无敏感泄漏）
- Apple Silicon 干净安装验证
- 性能基准（12 好友场景帧率）

---

## 五、开发阶段路线

| 阶段 | 名称 | 工作包依赖 | 验收标志 |
|------|------|-----------|----------|
| 0 | 契约冻结 + macOS 探针 | 全员 | 共享 Schema 通过 · Electron arm64 签名公证 DMG 安装成功 |
| 1 | 本地单人工作闭环 | 1 + 2 + 3 + 部分 4 | 录任务 → 排日程 → 工作动作 → 午休暂停 → 准点跑路 |
| 2 | 账号 + 同步 + 正式经济 | 4 + 5 | 幂等/并发/断网/工资变更 全通过 |
| 3 | 好友 + 排排坐 | 4 + 6 + 3 | 隐私抓包通过 · 12 角色性能达标 |
| 4 | AI 分析 + 个人速度 | 7 | AI 失败可降级 · 用户字段保留率 100% |
| 5 | 高准确桌面识别 | 8 | 权限撤销降级 · 无原图留存 |
| 6 | 加班奖励池 | 5 | 人民币分守恒差异为 0 |
| 7 | 资产扩充 + 上线准备 | 9 + 1 | DMG 安装 · 更新 · Gatekeeper 全通过 |

---

## 六、模块间依赖关系

```
                    ┌─────────────┐
                    │  contracts  │  ← 所有模块共享（先冻结）
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
   │   domain    │ │asset-runtime│ │test-fixtures│
   │ 排程/经济   │ │ Manifest 校 │ │  测试数据   │
   └──────┬──────┘ └──────┬──────┘ └─────────────┘
          │                │
    ┌─────┼──────┬─────────┼──────────┐
    │     │      │         │          │
┌───▼──┐┌─▼───┐┌─▼──┐┌────▼───┐┌────▼────┐
│ API  ││Real-││Desk-││AI Svc  ││Renderer │
│Server││time ││top  ││(Fast-  ││(React+  │
│(Nest)││(WS) ││Shell││ API)   ││PixiJS)  │
└──────┘└─────┘└─────┘└────────┘└─────────┘
```

---

## 七、数据库架构（简要 ERD）

### PostgreSQL（云端权威）

| 领域 | 核心表 |
|------|--------|
| 身份 | `users` · `auth_sessions` |
| 社交 | `friend_relations` · `friend_visibility_overrides` · `privacy_settings` |
| 设置 | `work_schedule_settings` · `wage_settings` |
| 任务 | `tasks` · `task_events` · `task_analysis_proposals` |
| 日程 | `schedule_drafts` · `schedules` · `schedule_blocks` |
| 承诺 | `daily_commitment_snapshots` · `commitment_tasks` |
| 工作日 | `workday_sessions` |
| 经济 | `nang_fee_wallets` · `nang_fee_ledger` · `overtime_pool_contributions` · `overtime_reward_settlements` · `overtime_reward_recipients` |
| 商店 | `shop_items` · `purchases` · `inventory_items` · `appearance_loadouts` |
| 隐私 | `privacy_consents` |

### SQLite（客户端本地）

| 表 | 用途 |
|----|------|
| `local_settings_cache` | 离线设置缓存 |
| `tasks_cache` | 任务列表缓存 |
| `schedule_cache` | 日程缓存 |
| `friends_cache` | 好友列表缓存 |
| `asset_cache_index` | 资源版本索引 |
| `offline_command_queue` | 离线命令队列 |
| `activity_feature_windows` | 活动识别特征窗口 |

---

## 八、技术选型总表

| 层级 | 技术 | 用途 |
|------|------|------|
| 桌面容器 | Electron (arm64) | macOS 菜单栏、透明窗口、权限 |
| 前端框架 | React + TypeScript + Vite | 设置/待办/日程/好友/商店 |
| 像素渲染 | PixiJS | 桌宠动作、排排坐、帽子叠加 |
| 客户端状态 | Zustand | 窗口内 UI 状态 |
| 服务端缓存 | TanStack Query | HTTP 请求缓存 |
| 本地存储 | SQLite | 离线队列、设置缓存 |
| 服务端 | NestJS + TypeScript | 全部业务 API |
| 数据库 | PostgreSQL | 权威数据源 |
| 实时通信 | Socket.IO + Redis | 在线状态、动作广播 |
| 缓存/限流 | Redis | presence、房间、限流 |
| AI 服务 | Python FastAPI | 分析、排程、视觉分类 |
| 对象存储 | S3 兼容 | 角色/帽子/动作资源 |
| 认证托管 | Supabase Auth（可选） | 密码哈希、Token |
| 测试 | Vitest + RTL + Playwright | 单元/组件/E2E |
| 监控 | OpenTelemetry + Sentry | 错误、性能、审计 |
| 发行 | Developer ID + Apple 公证 + DMG | 签名分发 |

---

## 九、建议团队最小配置

| 角色 | 人数 | 负责工作包 |
|------|------|-----------|
| macOS 桌面开发 | 1 | Shell (#1) + 活动识别 (#8) |
| 前端工程师 | 2 | UI (#2) + PixiJS (#3) |
| 后端工程师 | 2 | 服务端核心 (#4) + 经济 (#5) + 实时 (#6) |
| AI 工程师 | 1 | AI 服务 (#7) |
| 像素美术 | 1 | 资产管线 (#9) |
| QA | 1 | 测试 (#10) |
| **合计** | **8** | — |

> 💡 如果团队更小（4–5 人），可合并：
> - 桌面 + 前端（需兼顾 Electron 和 React）
> - 后端 + 实时（MVP 阶段可同进程部署）
> - AI 工程师兼活动识别

---

## 十、并行启动建议

**阶段 0 完成（契约冻结）后**，以下工作包可同时启动：

```
并行轨道 A: Desktop Shell + UI + PixiJS    （客户端）
并行轨道 B: 服务端核心 + 经济              （后端）
并行轨道 C: AI 服务                        （独立）
并行轨道 D: 美术资产管线                   （独立）
```

合并顺序：contracts → domain → 数据库迁移 → API → 客户端 → 实时 → AI → 资产 → E2E

---

*本文档由 PRD v2.0 自动生成，建议存入仓库 `docs/` 目录并随开发迭代更新。*
