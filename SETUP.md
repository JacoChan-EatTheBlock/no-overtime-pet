# 开发环境搭建指南

## 前置条件

- Node.js >= 20 (推荐用 `fnm` 或 `nvm`)
- pnpm >= 9.7 (`corepack enable && corepack prepare pnpm@9.7.0 --activate`)
- Python >= 3.11 (AI Service)
- macOS 13+ with Apple Silicon (桌面端开发)

## 云端服务 (免费额度即可)

| 服务 | 用途 | 创建方式 |
|------|------|----------|
| [Supabase](https://supabase.com) | PostgreSQL + Auth + Storage | 免费 project |
| [Upstash](https://upstash.com) | Redis (实时/缓存/限流) | 免费 tier |
| [Railway](https://railway.app) / [Fly.io](https://fly.io) | 部署 API & AI (可选) | 按用量计费 |

> 💡 **不需要在本地安装 PostgreSQL 或 Redis！** 全部连云端。

## 快速开始

```bash
# 1. 克隆仓库
git clone <repo-url>
cd no-overtime-pet

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 Supabase / Upstash 密钥

# 4. 构建共享包
pnpm build --filter=@not/contracts --filter=@not/domain --filter=@not/asset-runtime

# 5. 启动开发
pnpm dev:desktop    # Electron 桌面端
pnpm dev:api        # NestJS API (连 Supabase PostgreSQL)
pnpm dev:realtime   # Socket.IO (连 Upstash Redis)

# 6. AI Service (独立 Python 环境)
cd apps/ai-service
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -m src.main
```

## 云端服务配置步骤

### Supabase

1. 前往 [supabase.com](https://supabase.com) 创建新项目
2. Settings → API → 复制 `URL` 和 `anon key`
3. Settings → Database → 复制 Connection String (Transaction mode)
4. 填入 `.env.local`

### Upstash Redis

1. 前往 [upstash.com](https://upstash.com) 创建 Redis 数据库
2. 选择离你最近的区域
3. 复制 REST URL 和 Token
4. 填入 `.env.local`

### 数据库迁移

```bash
# 运行迁移（连接 Supabase PostgreSQL）
pnpm --filter=@not/api migration:run
```

## 目录导航

```
apps/desktop/     Electron macOS 桌面端
apps/api/         NestJS 后端 (→ Supabase PostgreSQL)
apps/realtime/    Socket.IO 实时网关 (→ Upstash Redis)
apps/ai-service/  Python FastAPI AI 服务
packages/         共享 TypeScript 库
assets/           像素角色/帽子/动作资产
docs/             PRD 与架构文档
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm build` | 构建所有包 |
| `pnpm test` | 运行所有测试 |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` | ESLint |
| `pnpm dev:desktop` | 启动桌面端开发 |
| `pnpm dev:api` | 启动 API 开发 |
