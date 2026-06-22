# 部署到 Vercel

本项目为 Vite + React + Three.js 单页应用，部署到 Vercel。

## 前置要求

- Node.js ≥ 20
- npm ≥ 10
- Vercel 账号（https://vercel.com）
- 项目已推送到 GitHub / GitLab / Bitbucket

## 本地验证

推送前先本地构建确认通过：

```bash
npm install
npm run build
npm run preview
```

构建产物在 `dist/`，`preview` 会启动本地静态服务器（默认 4173）供你检查。

## 部署方式

### 方式一：CLI 部署（推荐，可重复）

1. 安装 Vercel CLI：

   ```bash
   npm i -g vercel
   ```

2. 登录：

   ```bash
   vercel login
   ```

3. 首次部署（会交互式询问，按默认即可）：

   ```bash
   vercel
   ```

   - Set up and deploy? → **Y**
   - Which scope → 选你的账号
   - Link to existing project? → **N**
   - Project name → `pindou`（或你喜欢的名字）
   - In which directory → 回车用当前目录
   - Want to modify settings? → **N**（`vercel.json` 已经配置好了）

4. 部署到生产环境：

   ```bash
   vercel --prod
   ```

   部署完成后 CLI 会输出 URL，如 `https://pindou-xxx.vercel.app`。

### 方式二：Git 集成（推荐长期使用）

1. 推送代码到 GitHub：

   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. 在 https://vercel.com/new 导入 GitHub 仓库

3. Framework Preset 会自动识别为 **Vite**，其余配置 `vercel.json` 会覆盖

4. 点 **Deploy**，之后每次 `git push origin main` 自动部署

## 配置说明

`vercel.json` 已经配置好以下内容，**不需要在 Vercel 控制台手动改**：

| 项 | 值 | 说明 |
|---|---|---|
| `framework` | `vite` | Vercel 自动识别 Vite 项目 |
| `buildCommand` | `npm run build` | `tsc && vite build` |
| `outputDirectory` | `dist` | 构建产物目录 |
| `installCommand` | `npm install` | 依赖安装 |
| `NODE_VERSION` | `20` | Node 运行时版本 |
| `cleanUrls` | `true` | URL 末尾不带斜杠 |
| `/assets/**` 缓存 | `immutable, 1 年` | hash 文件名，永久缓存 |
| `index.html` 缓存 | `no-cache` | 入口 HTML 每次回源 |

## 打包优化（已完成）

`vite.config.ts` 配置了 `manualChunks`，把 bundle 拆成 5 个独立 chunk：

```
dist/assets/
├── three-<hash>.js      # three + @react-three/*  (944 KB, gzip 256 KB)
├── vendor-<hash>.js     # react + react-dom + zustand  (183 KB, gzip 58 KB)
├── motion-<hash>.js     # motion  (129 KB, gzip 42 KB)
├── index-<hash>.js      # 业务代码  (147 KB, gzip 29 KB)
└── index-<hash>.css     # 样式  (24 KB, gzip 5 KB)
```

首屏 gzip 总大小约 **390 KB**。各 chunk 独立 hash，改业务代码不会让 `three` 重新下载。

## 常见问题

### Q: 部署后页面白屏？

打开浏览器控制台看报错。最常见原因是路径问题，确认 `vite.config.ts` 没有设置 `base`（默认 `./` 在 Vercel 根域名下正常）。

### Q: TypeScript 报错导致构建失败？

`npm run build` 会先跑 `tsc` 类型检查。本地先 `npx tsc --noEmit` 看具体错误。

### Q: 想回滚到上个版本？

Vercel 控制台 → 项目 → Deployments 列表，找到目标版本点菜单 → `Promote to Production`。

### Q: 自定义域名？

Vercel 控制台 → 项目 → Settings → Domains → 添加域名，按提示配置 DNS。

### Q: bundle 还是觉得大？

`three` 占了 944 KB（gzip 256 KB），是 three.js 本身的大小。进一步优化方向：
- 用 `React.lazy` 懒加载 3D 部分（需把默认模式改成 `"2d"`）
- 评估是否需要 `@react-three/drei` 的所有组件（`Environment`、`Lightformer` 体积较大）
- 换 `three` 的精简构建（不推荐，工作量大）

**不建议改外部 CDN**（unpkg/jsdelivr）：Vercel 本身已是全球 CDN，外部 CDN 会多 DNS 查询、国内访问不稳定、失去版本控制。

## 一键部署脚本

项目根目录提供 `deploy.sh`（Git Bash / WSL / macOS / Linux 可用）：

```bash
./deploy.sh           # 部署到 preview 环境
./deploy.sh --prod    # 部署到 production
```

脚本会自动：检查登录 → 安装依赖 → 构建 → 调用 `vercel` CLI 部署。
