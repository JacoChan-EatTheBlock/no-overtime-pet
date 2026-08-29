#!/bin/bash
# 不要加班 — 快速启动桌面端开发
set -e

echo "🐱 不要加班 — 启动桌面端开发环境"
echo ""

cd "$(dirname "$0")"

# Check node
if ! command -v node &> /dev/null; then
    echo "❌ 需要 Node.js >= 20, 请先安装"
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 安装 pnpm..."
    corepack enable
    corepack prepare pnpm@9.7.0 --activate
fi

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    pnpm install
fi

# Build shared packages first
echo "🔨 构建共享包..."
pnpm --filter @not/contracts build
pnpm --filter @not/domain build
pnpm --filter @not/asset-runtime build

# Start desktop dev
echo ""
echo "🚀 启动 Electron 桌面端..."
echo "   Renderer: http://localhost:5173"
echo "   按 Ctrl+C 退出"
echo ""
pnpm --filter @not/desktop dev
