# Windows Foundation v1

> 状态：冻结基座规范
> 平台：Windows x64 可分享 Demo
> 基座分支：`codex/windows-foundation`
> 基座标签：`windows-foundation-v1`
> 精确 SHA：提交完成后写入 8 份工作组任务书；禁止使用 `latest` 或浮动分支代替

## 1. 目的

本规范是 8 个 AI/IDE 并行开发组的共同工程基座。它只冻结会造成合并冲突或数据不兼容的内容：目录所有权、共享契约、数据库约定、环境变量、端口、迁移号段、测试入口、分支/worktree 规则和合并顺序。

业务规则仍以根 PRD、`docs/prd/01-shared-contracts.md` 和对应模块 PRD 为准。若本规范与用户最新明确决定冲突，以用户最新决定为准并先修正文档；开发组不得自行选择一种解释继续开发。

## 2. 当前交付边界

- 当前只面向 Windows x64 可分享 Demo，macOS 暂停。
- 代码签名、安装器、自动更新、公开下载和 SmartScreen 信誉不是当前门禁。
- 未签名 Demo 可能触发 SmartScreen/Defender；只能作为已知限制记录，不能声称公开发行就绪。
- 日常并行开发全部在本机独立 worktree 和独立 Docker Compose project 中完成。
- 旅行魔域项目服务器当前不作为日常开发依赖；只有本地模块通过后，才可用于隔离的联调环境。
- 使用旅行魔域服务器时必须使用独立数据库、Redis namespace/instance、进程名、端口、目录、日志和 secret，禁止复用旅行魔域业务数据或凭据。

## 3. 固定技术选择

| 层 | 选择 | 约束 |
|---|---|---|
| 包管理 | npm workspaces | 只提交根 `package-lock.json`，禁止新增 pnpm/yarn lock |
| Desktop | Electron + React + TypeScript + Vite | 当前 `apps/desktop` 为唯一桌面工程 |
| API | NestJS 单进程 | HTTP 与 Socket.IO 当前同一进程，禁止先拆微服务 |
| 权威数据库 | PostgreSQL | 账号、任务、计划、好友、余额、账本、购买均以服务端为准 |
| 本地存储 | SQLite 接口预留 | 只允许缓存、草稿和 outbox；Foundation 不引入第二份业务真相 |
| Realtime/Cache | Socket.IO + Redis | presence、限流、短期事件；不得作为持久权威数据 |
| Contract | TypeBox JSON Schema + Ajv | `packages/contracts` 是 HTTP/Realtime/IPC 类型唯一事实源 |
| Tests | Vitest + RTL；后续 Playwright Electron | 每组至少提供单元/契约测试；WS-08 负责跨模块 E2E |

## 4. 目录与所有权

```text
apps/
  desktop/
    main/                 WS-01 独占
    preload/              WS-01 独占
    renderer/src/
      app/                Foundation/WS-08；其他组禁止修改
      components/         Foundation 共享；变更需 RFC
      styles/             Foundation 共享；变更需 RFC
      features/
        account/          WS-02
        task-proposal/    WS-03
        schedule/         WS-04
        economy/          WS-05
        activity-pet/     WS-06
        social/           WS-07
  api/
    src/kernel/           Foundation；工作组禁止修改
    src/modules/
      account/            WS-02
      planning/           WS-03
      schedule/           WS-04
      economy/            WS-05
      social/             WS-07
packages/
  contracts/              Foundation 冻结；工作组只读
  domain/
    src/account/          WS-02
    src/planning/         WS-03
    src/schedule/         WS-04
    src/economy/          WS-05
    src/activity/         WS-06
    src/social/           WS-07
  db/migrations/          按号段共享目录，不共享文件
  asset-runtime/          WS-06
  test-fixtures/          WS-08；其他组仅在自己的测试目录写局部 fixture
tests/e2e/                WS-08
docs/development/rfcs/    任一组可新增自己的 RFC 文件，禁止覆写他组 RFC
```

现有 UI 还原目录 `auth`、`settings`、`task-schedule`、`economy-customization`、`pet-social-menu` 是可复用输入，不是新的并行写入区。工作组若需要迁移/复用，必须在自己的新 feature 目录中通过 import 或复制后注明来源；禁止多组同时改同一旧目录。最终统一接线由 WS-08 完成。

## 5. 共享契约冻结规则

`packages/contracts/src` 中以下文件由 Foundation 冻结：

```text
common.ts
api.ts
auth.ts
tasks.ts
proposals.ts
schedules.ts
work-settings.ts
economy.ts
activity.ts
pet.ts
social.ts
realtime.ts
desktop-ipc.ts
validator.ts
index.ts
```

固定约束：

- JSON 字段使用 `camelCase`；数据库列使用 `snake_case`。
- ID 是 UUID v4 字符串。
- 时间戳是 UTC RFC 3339 字符串；自然日是 `YYYY-MM-DD`；时区使用 IANA 名称。
- 时长是非负整数毫秒。
- 数据库人民币最小单位使用 `BIGINT`；API 金额使用十进制整数字符串，禁止 JSON number 表示账本金额。
- 可并发修改的资源包含 `revision`；策略/Schema 包含 `policyVersion` 或 `schemaVersion`。
- 删除采用 `deletedAt`/`deleted_at` 软删除，除非 PRD 明确要求物理删除。
- 可重试写操作必须接受 `idempotencyKey`。

HTTP 成功包络：

```ts
{
  schemaVersion: "1.0";
  requestId: string;
  serverTime: string;
  data: unknown;
}
```

HTTP 错误包络：

```ts
{
  schemaVersion: "1.0";
  requestId: string;
  serverTime: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

开发组发现缺字段、缺错误码或语义冲突时：

1. 在 `docs/development/rfcs/WS-XX-*.md` 写出调用场景、现契约不足、最小变更和兼容影响；
2. 停止依赖该契约缺口的实现；
3. 可以继续不依赖该缺口的工作；
4. 禁止在模块内部复制一份“临时共享类型”；
5. 由 Foundation 维护者统一修改 contracts 并发布新的基座 SHA/版本。

## 6. 数据库约定

### 6.1 命名与类型

- 表名、列名、索引名、约束名全部 `snake_case`。
- 主键：`id uuid PRIMARY KEY DEFAULT gen_random_uuid()`。
- 时间：`timestamptz`，服务端统一以 UTC 写入。
- 自然日：`date`，同时保存业务所需 IANA 时区。
- 时长：`bigint` 毫秒并添加非负约束（允许负值的经济字段除外）。
- 金额：`bigint` 人民币分；禁止 `float/double/numeric` 参与账本守恒计算。
- JSON 只用于有明确 Schema/版本的扩展字段，不用于逃避关系建模。
- 每张可变业务表至少有 `created_at`、`updated_at`；需要同步/并发控制时增加 `revision bigint`。
- 软删除字段统一 `deleted_at timestamptz NULL`。

### 6.2 迁移号段

| 号段 | 所有者 | 内容 |
|---|---|---|
| `0000–0999` | Foundation | extension、核心用户标识、幂等、outbox、Schema 版本 |
| `1000–1999` | WS-02 | 账号、凭据、资料、会话 |
| `2000–2999` | WS-03 | 任务、Proposal、承诺快照 |
| `3000–3999` | WS-04 | 排程、时间块、锁定和版本 |
| `4000–4999` | WS-05 | 工时、钱包、账本、奖励池、目录、库存 |
| `5000–5999` | WS-07 | 好友、单向可见性、社交投影持久配置 |
| `6000–8999` | 保留 | 未经 Foundation 批准不得使用 |
| `9000–9999` | WS-08 | 仅测试/演示种子；不得作为生产迁移运行 |

文件名格式：`NNNN_short_description.sql`。一个编号只允许一个文件。迁移一经合并禁止修改；修正必须新增迁移。每份迁移必须提供从空库执行的测试，不要求破坏性 down migration。

### 6.3 Foundation 核心表

- `core_users`：跨模块用户标识与最小状态，不保存密码；
- `core_idempotency_keys`：用户、操作类型和幂等键唯一；
- `core_outbox_events`：事务内事件出站；
- `core_schema_versions`：Schema/迁移审计。

## 7. 环境变量与端口

仓库只提交 `.env.example`。开发者复制为 `.env.local`；任何真实服务器地址、密码、token、私钥或 API Key 禁止提交。

Foundation 默认端口：

| 能力 | 变量 | 默认 |
|---|---|---|
| Renderer dev | `RENDERER_PORT` | `5173` |
| API | `API_PORT` | `28780` |
| PostgreSQL host | `POSTGRES_PORT` | `55430` |
| Redis host | `REDIS_PORT` | `56380` |
| PostgreSQL DB | `POSTGRES_DB` | `no_overtime_dev` |

并行工作组 N 使用：

```text
RENDERER_PORT = 5180 + N
API_PORT      = 28780 + N
POSTGRES_PORT = 55430 + N
REDIS_PORT    = 56380 + N
POSTGRES_DB   = no_overtime_wsN
COMPOSE_PROJECT_NAME = no-overtime-wsN
```

例如 WS-03：renderer `5183`、API `28783`、PostgreSQL `55433`、Redis `56383`、DB `no_overtime_ws3`。

URL/secret 规则：

- `VITE_API_BASE_URL` 必须含协议、host、port，不以 `/` 结尾；它是公开客户端配置，不得包含凭据。
- `DATABASE_URL` 只在 API/迁移进程使用，绝不注入 renderer。
- `REDIS_URL` 只在 API/Realtime 使用。
- 所有 `VITE_*` 变量都会进入 renderer 产物，禁止放 secret。
- 旅行服务器环境变量使用单独 secret 管理，不复制到仓库 `.env.example`。

## 8. API 与模块注册

- API 基础路由前缀为 `/v1`。
- 健康检查为 `GET /v1/health`，只返回版本、时间与依赖状态，不泄露连接串。
- `apps/api/src/app.module.ts` 在 Foundation 预注册 account、planning、schedule、economy、social 模块。
- 各工作组只能在自己的 module 目录添加 controller/service/repository，不修改 `app.module.ts`。
- Socket.IO 复用 API 进程，namespace 和事件名以 contracts 为准。
- 数据库写入由模块 service/repository 完成；controller 不直接拼 SQL。

## 9. Git、分支与 worktree

所有工作组必须从 Foundation 最终 SHA 创建，不能从“当前分支最新提交”创建。

```powershell
git fetch --all --prune
git worktree add <绝对目录> -b codex/win-wsXX-<slug> <WINDOWS_FOUNDATION_SHA>
git -C <绝对目录> rev-parse HEAD
```

要求：

- 每个 AI/IDE 一个独立绝对目录；禁止多个 AI 同时打开同一 worktree。
- 分支名固定以 `codex/win-wsXX-` 开头。
- 第一次提交前核对 `git rev-parse HEAD` 等于任务书 `BASE_SHA`。
- 禁止直接提交/推送 `main`。
- 禁止合并其他工作组分支来“提前联调”。
- 禁止修改根 lockfile，除非任务书明确分配依赖变更；需要新增共享依赖时走 RFC。
- 每次提交只包含本工作组允许路径；用 `git diff --name-only <BASE_SHA>...HEAD` 检查越界。

建议分支：

```text
codex/win-ws01-shell
codex/win-ws02-account-auth
codex/win-ws03-task-proposal
codex/win-ws04-schedule
codex/win-ws05-economy-shop
codex/win-ws06-activity-pet-assets
codex/win-ws07-social-realtime
codex/win-ws08-e2e-acceptance
```

## 10. 测试入口与证据

Foundation 统一入口：

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
docker compose --env-file .env.local -f docker-compose.dev.yml up -d
```

每个工作组交付至少包含：

- 单元/契约测试；
- 失败路径与隐私边界测试；
- 执行命令、结果和环境；
- `git diff --check`；
- 修改文件清单；
- 已验证/未验证真实环境；
- 数据库迁移和兼容影响；
- 未解决 RFC。

静态检查、类型检查或浏览器截图不能替代真实 Electron、Windows 系统能力、数据库事务、实时联机或在线模型证据。

## 11. 合并门禁与顺序

推荐顺序：

```text
Foundation
  → WS-01 Shell
  → WS-02 Account/Auth
  → WS-03 Task/Proposal
  → WS-04 Schedule
  → WS-06 Activity/Pet/Assets
  → WS-05 Economy/Shop
  → WS-07 Social/Realtime
  → WS-08 E2E/Acceptance
```

每次合并前：

1. 检查只修改允许路径；
2. 检查迁移号段无冲突且旧迁移未被重写；
3. 检查 contracts 未被工作组私改；
4. 在当前集成分支运行 lint、typecheck、test、build；
5. 有 schema/API 变化时从空库运行迁移和契约测试；
6. 更新合并记录与未验证边界；
7. 保持可回退的普通 merge commit，不 squash 掉必要的迁移/证据语义。

## 12. Foundation 完成定义

- 权威文档一致指向 Windows x64 可分享 Demo；
- npm workspace、根 lockfile 和统一命令可用；
- `.env.example`、Docker Compose、端口与 worktree 隔离规则已提交；
- contracts 可构建、可验证，并覆盖 HTTP/Realtime/IPC 核心边界；
- PostgreSQL 核心迁移可从空库执行；
- NestJS API 预注册模块且健康检查可测试；
- 8 个工作组有互斥目录和迁移号段；
- lint、typecheck、test、build 结果有记录；
- 最终 commit SHA 和 `windows-foundation-v1` 标签已固定；
- 8 份任务书回填相同 `BASE_SHA`，可直接转交其他 AI。
