# SEO 运维手册

拼豆 Pindou 的关键字布局、索引情况和后续优化清单。
主域名：**https://pindou.wuyuan.store**

---

## 一、关键字布局

### 1. 核心关键字（中文）
| 关键字 | 位置 | 说明 |
|---|---|---|
| 拼豆 | `<title>` 起首、`<h1>`、JSON-LD `name` | 主词，覆盖品牌 + 品类 |
| 拼豆画 | `<title>`、description、footer | 常见搜索词 |
| 拼豆模板 / 拼豆图案 / 拼豆设计 | keywords、JSON-LD `featureList` | 次级搜索词 |
| 在线拼豆 / 拼豆制作工具 | title 副标、footer | 交易型搜索 |
| 图片转拼豆 | title、description、featureList | 功能型长尾 |
| 像素画 / 像素艺术 / 像素画制作 | description、keywords | 相近品类，分一杯羹 |
| 3D 拼豆 / 3D 像素画 | title、description、featureList | 差异化卖点 |

### 2. 辅助英文关键字
- `Perler beads`、`fuse beads`、`hama beads` — 海外品牌词
- `pixel art maker`、`bead pattern designer` — 工具类词
- 在 manifest `description`、JSON-LD `alternateName` 中出现

### 3. 长尾 / 场景关键字
- 儿童手工、亲子手工、创意 DIY、减压
- 像素风、8-bit、复古游戏
- 免登录、免费、浏览器直接使用

---

## 二、已完成的 SEO 优化

### 技术 SEO
- [x] `<html lang="zh-CN">` 语言声明
- [x] 扩展 `<title>`：核心关键字前置，品牌词 "Pindou" 收尾
- [x] `meta description` 含主词 + 卖点 + 行动号召
- [x] `meta keywords`（虽权重低，百度仍读）
- [x] `meta robots` / `googlebot` / `bingbot`：允许索引，`max-image-preview:large`
- [x] `link rel="canonical"` 指向主域名
- [x] `link rel="apple-touch-icon"` + `link rel="manifest"`
- [x] `theme-color` / `color-scheme`

### Open Graph（微信 / 微博 / Facebook 分享卡）
- [x] `og:type=website` / `og:site_name` / `og:locale=zh_CN` + `en_US` 备选
- [x] `og:url` / `og:title` / `og:description`
- [x] `og:image` 1200×630（暂用 SVG，见下文「待办」）

### Twitter Card
- [x] `twitter:card=summary_large_image` + 对应 title/description/image

### 结构化数据 JSON-LD
- [x] `WebApplication`：类别 `DesignApplication`、语言、特性列表、免费 Offer、受众
- [x] `WebSite`：站点实体
- [x] `Organization`：组织实体

### 文案与语义化
- [x] `<h1 class="seo-only">` 视觉隐藏但可被爬虫读取，覆盖核心关键字
- [x] `<noscript>` 降级文案（含关键字，供极简爬虫读取）
- [x] `<header>` / `<main>` / `<footer>` 语义化
- [x] 跳到主内容的无障碍链接（`sr-only focus:not-sr-only`）
- [x] `aria-label="拼豆 3D 创作画布"` 等可访问性描述

### 资源文件
- [x] `public/robots.txt`：放行所有主流爬虫（Google / Bing / Baidu / Sogou / 360）
- [x] `public/sitemap.xml`：含 `hreflang` zh-CN / en / x-default
- [x] `public/site.webmanifest`：PWA 可安装性（有助于 Chrome 体验分）
- [x] `public/og-image.svg`：默认社交分享图

### 服务器 / CDN 头（vercel.json）
- [x] 根路径返回 `Link: rel="sitemap"` + `rel="canonical"`
- [x] `Content-Language: zh-CN`
- [x] `X-Content-Type-Options: nosniff`
- [x] `robots.txt` / `sitemap.xml` / `manifest` 显式 Content-Type
- [x] 资源 immutable 缓存 1 年

---

## 三、发布后必须做的事（一次性）

### 1. 生成 PNG 版 OG 图替换 SVG
SVG 作为 OG 图微信 / Twitter 部分场景不渲染。推荐做法：
```bash
# 用 Inkscape / Figma / 在线工具把 public/og-image.svg 导出为 1200×630 的 PNG
# 保存到 public/og-image.png
```
然后把 `index.html` 与 `site.webmanifest` 里的 `/og-image.svg` 改为 `/og-image.png`，
把 `og:image:type` 设置为 `image/png`。Twitter / 微信 / Telegram 的预览会更稳定。

### 2. 生成 PNG 图标（可选，但推荐）
PWA 安装到 iOS 主屏时 `apple-touch-icon` 不支持 SVG：
```bash
# 用 https://realfavicongenerator.net/ 基于 favicon.svg 生成
# icon-192.png / icon-512.png / apple-touch-icon.png 放到 public/
```

### 3. 提交到各搜索引擎
- **Google Search Console**：https://search.google.com/search-console
  - 添加资源 `https://pindou.wuyuan.store/`
  - 提交 sitemap：`https://pindou.wuyuan.store/sitemap.xml`
  - 请求编入索引首页
- **Bing Webmaster**：https://www.bing.com/webmasters
- **百度站长平台**：https://ziyuan.baidu.com
  - 链接提交 →sitemap→ 添加 `https://pindou.wuyuan.store/sitemap.xml`
  - 手动提交首页 URL
- **搜狗 / 360 站长平台**（可选）

### 4. 百度主动推送（可选）
百度对 SPA 的索引比较弱。如果收录慢，考虑：
- 写一个 `/sitemap-ping` 的 Cloud Function 定时 ping 百度
- 或用百度 JS 自动推送（在 `index.html` 加百度推送 JS）

---

## 四、日常运营（内容与外链）

SEO 不是一次性的事。长期做法：

### 1. 内容
- 增加模板：每个模板（如「皮卡丘拼豆模板」「原神像素画」）对应一个可被搜索的路径或锚点
- 玄学做法：为热门模板单独生成静态 HTML（SSG），例如 `/template/pikachu`
- 写一篇「如何把照片转成拼豆图案」的教程，放首页外链或 `/blog`

### 2. 外链
- 在小红书、B 站、抖音发「拼豆作品 + 本站链接」（对百度权重帮助大）
- 在 GitHub README 支援的项目里互链
- 友情链接：找手工 / 像素画 / DIY 类博客交换链接

### 3. 监控
- Google Search Console：每周看一次「性能」→ 新出现的查询词
- 百度统计 / Bing Webmaster Reports
- UptimeRobot：监控域名可用性（宕机会严重影响排名）

---

## 五、技术注意点

### SPA 与 SEO
- 当前是纯 CSR（客户端渲染）。主流爬虫（Google、Bing）能跑 JS，但百度较弱
- 如果发现百度收录不全，可以考虑：
  - 迁到 Vite SSG（`vite-react-ssg`）
  - 或在 Vercel Edge 上做一层简单 SSR（只把首页文案直出）
- 已做的缓解：`<noscript>` 降级文案 + JSON-LD 结构化数据

### 别做的事
- 不要堆关键字（keywords 已经放了，别再往正文塞 100 遍 "拼豆"）
- 不要用隐藏文字（`.seo-only` 的内容写一两句即可，已控制）
- 不要买链接农场
- 不要频繁改 `canonical` / URL 结构

---

## 六、变更追踪

| 日期 | 变更 |
|---|---|
| 2026-06-22 | 初始化完整 SEO 基础（meta、OG、JSON-LD、robots、sitemap、manifest、OG 图、vercel.json headers） |
