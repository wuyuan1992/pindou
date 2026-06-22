#!/usr/bin/env bash
# Vercel 部署脚本
# 用法:
#   ./deploy.sh              # 部署到 preview
#   ./deploy.sh --prod       # 部署到 production
#   ./deploy.sh --skip-build # 跳过本地构建(信任 Vercel 远端构建)

set -euo pipefail

PROD=false
SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --prod) PROD=true ;;
    --skip-build) SKIP_BUILD=true ;;
    *) echo "未知参数: $arg" >&2; exit 1 ;;
  esac
done

echo "==> 检查 Vercel CLI..."
if ! command -v vercel >/dev/null 2>&1; then
  echo "    未安装，开始全局安装 vercel..."
  npm install -g vercel
fi

echo "==> 检查登录状态..."
if ! vercel whoami >/dev/null 2>&1; then
  echo "    未登录，请按提示完成登录:"
  vercel login
fi

echo "==> 检查依赖..."
if [ ! -d node_modules ]; then
  echo "    安装依赖..."
  npm install
fi

if [ "$SKIP_BUILD" = false ]; then
  echo "==> 本地构建验证..."
  npm run build
  echo "    构建成功，产物大小:"
  du -sh dist/assets/*.js dist/assets/*.css 2>/dev/null | sort -rh
fi

echo "==> 部署到 Vercel ($([ "$PROD" = true ] && echo 'production' || echo 'preview'))..."
if [ "$PROD" = true ]; then
  vercel --prod --yes
else
  vercel --yes
fi

echo ""
echo "==> 部署完成!"
echo "    Dashboard: https://vercel.com/dashboard"
