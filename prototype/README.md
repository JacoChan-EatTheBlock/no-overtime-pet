# 不要加班 · todo + AI 逻辑原型（hackathon）

核心功能函数 + AI 接入，纯 TypeScript。逻辑层（`src/`）不依赖 UI 和服务端；
`web/` 是接在它上面的像素 UI，来自 `codex/ui-task-schedule` 分支的还原稿。

## 跑起来

```bash
cd prototype
npm install          # 已装过可跳过
npm test             # 17 个单测（纯逻辑层，不依赖浏览器）
npm run demo         # 命令行端到端演示；自动读取根目录 .env，默认优先调 SiliconFlow
npm run web          # 构建像素 UI 并启动：http://127.0.0.1:4173（Key 只在本地 Node 代理中）
NOT_FORCE_BASELINE=1 npm run demo   # 强制离线确定性演示（现场网络不稳时用这个）
export ANTHROPIC_API_KEY=sk-ant-...  # 可选备用：仅在没有 LLM_API_KEY 时使用 Anthropic Provider
```

改 UI 时用两个终端更快（vite 热更新，API 仍由 Node 侧代理）：

```bash
npm run web:api      # 终端 1：仅 API，4173
npm run web:dev      # 终端 2：vite dev，5174，/api 代理到 4173
```

`PROTOTYPE_PORT=4174 npm run web:api` 可换端口。旧的纯 JS 演示壳仍在 `/showcase.html`。

## 像素 UI（`web/`）

6 个正式画面（01 任务气泡 / 05 待办列表 / 06 AI 建议确认 / 07 安排草案 / 12 跑路确认 / 13 跑路结果），
视觉沿用还原稿，数据全部来自上面的逻辑层——没有一处 mock 数字。页面底部的画面切换条只为演示和视觉 QA，不属于产品 UI。

| 文件 | 职责 |
|---|---|
| `web/adapter/mapping.ts` | 契约适配层：枚举↔中文、毫秒↔分钟、epoch↔`09:30–10:10`。UI 只认这里的 `Ui*` 视图模型，换后端只改这一个文件 |
| `web/adapter/useEngine.ts` | 把 `TaskStore` / `applyProposal` / `solveSchedule` 装配成 UI 数据源；AI 走 `/api/*`，失败逐层降级 |
| `web/adapter/nang-fee.ts` | 窝囊费公式，与 `packages/domain/src/nang-fee.ts` 一致（接入 monorepo 时删掉改为 import） |
| `web/shims/node-crypto.ts` | 浏览器端 `node:crypto` 垫片（`randomUUID` + 同步 SHA-256），让逻辑层源码零改动跑在浏览器里 |
| `web/ui/` | 还原稿的像素组件与 6 屏；只改了数据来源和三处写死尺寸，视觉语言未动 |

浏览器本地跑 store / accept / solveSchedule，`LLM_API_KEY` 只留在 Node 侧的 `/api/task-analysis`
和 `/api/schedule`；排程请求把标题替换成 `[LOCAL_TASK]` 再送出，模型拿不到任务内容。

## 模块 → PRD 对照

| 文件 | 职责 | PRD |
|---|---|---|
| `types.ts` | 最小契约类型（与共享契约同名同语义） | 01 |
| `urgency.ts` | 紧急度纯函数，阈值带版本集中一处 | 04 §4 |
| `store.ts` | 任务 CRUD：revision 乐观锁、幂等完成、软删除 | 04, 13 §4 |
| `catalog.ts` | 类别目录：关键词分类 + 冷启动基线时长 | 05 §6.1 |
| `calibration.ts` | 个人速度：5 个高置信样本后启用，含来源权重与时间衰减 | 05 §6.2 |
| `baseline.ts` | 确定性降级估计（模型挂了也能出数） | 05 §7 |
| `validator.ts` | Proposal 校验：枚举/5min–40h/子任务和±30%，不过整体拒绝 | 05 §7 |
| `accept.ts` | “确认建议”装配：acceptedFields+overrides→patch，USER 字段不被覆盖 | 05 §3, 13 §5.2 |
| `ai.ts` | 可替换 `TaskAnalysisProvider`；已接 SiliconFlow，保留 Anthropic 备用，任何失败降级 baseline。模型只出客观估计，个人速度乘数和"会议强制 ATOMIC"由确定性层统一套用，不依赖模型自觉遵循 prompt 提示 | 05 |
| `proposal.ts` | 任务输入哈希；防止旧 Proposal 写入已变更任务 | 05 |
| `scheduler.ts` | AI 生成日程草案；确定性校验 DDL/午休/工作时段/重叠，失败降级 50/10 基线 | 06 |
| `schedule-ai.ts` | SiliconFlow 日程 Provider；只发送结构化排程约束，不发送任务标题 | 06 |
| `flow.ts` | 创建即分析编排（分析失败不回滚任务） | 04 §2 |
| `demo.ts` | 演示脚本：录任务→分析→确认→排程→承诺候选→完成→速度学习 | — |
| `web-server.ts` | 本地 Node 代理：`/api/task-analysis`、`/api/schedule`，并托管 `web/dist` | — |

## 演示话术（评委版）

1. 用户只填 3 个字段，**创建即自动进 AI 分析**——没有"手动分析"按钮（产品已锁定决定）。
2. AI 只出建议（Proposal），**点确认才写入任务**；用户改过的字段 AI 永远不覆盖（`fieldOrigins`）。
3. 断网/超时/拒答 → **自动降级确定性基线**，流程不断（现场可拔网线演示）。
4. AI 决定排程顺序和时间块，但草案必须通过 DDL、午休、工作时间和重叠校验；不合法时整份拒绝并降级。
5. 只有完整排入日程的任务才会被建议为“今日承诺任务”，用户确认日程时才冻结。
6. 确认子任务拆分后，父任务只作汇总容器，由子任务替代它参与排程。
7. 同类别累积 5 个高置信样本后，才启用个人速度乘数；乘数按 AI 实际返回的类别套用，且在确定性层统一执行，不指望模型自己参考提示词打折。
8. 会议类别不信任模型给出的可拆分性判断，确定性层强制改回 ATOMIC，避免一场会被切成跨午休的好几段。

## 之后迁移

当前 Demo 的任务、已确认 AI 建议和最近日程只保存在浏览器 `localStorage`，刷新仍在；本机 Node 转发层不落库。SiliconFlow 已实现 `TaskAnalysisProvider` 和 `ScheduleProvider`，模型输出仍不能越过确定性校验直接写正式数据。

本地 Demo 之后迁移正式工程时，类型换成 `@not/contracts`，核心确定性规则进入 `packages/domain`。本地优先只是 Demo 演示口径，不修改正式 PRD 的服务端权威规则。

> 当前原型为了本地演示直连 SiliconFlow。正式 Electron 客户端不能携带 `LLM_API_KEY`，合并时应改为调用 Jaco 的服务端 AI Gateway。
