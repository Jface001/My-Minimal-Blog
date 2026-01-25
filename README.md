# 极简静态博客系统 (My Minimal Blog)

这是一个基于 Node.js 的超轻量级静态博客生成器。主打极简设计、极致性能和纯粹的阅读体验。

## ✨ 特性

- **极简设计**：无多余装饰，专注于内容阅读。
- **宋体排版**：采用思源宋体，提供舒适的中文阅读体验。
- **智能目录**：自动生成文章悬浮目录，支持移动端自动隐藏。
- **自动化**：
  - 自动提取文章摘要。
  - 自动提取正文图片作为封面（支持左右布局）。
  - 自动生成面包屑导航。
- **高性能**：纯静态 HTML/CSS，秒开加载。

## 🛠 技术架构

本博客系统遵循 **"Less is More"** 的工程理念，摒弃了现代前端开发中常见的复杂构建工具链。

- **核心驱动**: Node.js 原生 ES Modules。
- **构建模式**: SSG (Static Site Generation)，构建时生成纯静态 HTML。
- **依赖极简**: 
  - `marked`: Markdown 解析与渲染。
  - `front-matter`: 解析文章头部的 YAML 元数据。
  - `highlight.js`: 代码高亮支持。
- **无重型框架**: **0** React/Vue/Angular，**0** Webpack/Vite。
- **原生 CSS**: 使用 CSS Variables 实现主题系统，无 Tailwind/Bootstrap 依赖，CSS 体积极小。

## 🎨 设计理念

1. **内容至上 (Content First)**
   - 移除了所有不必要的边框、阴影和背景色块。
   - 列表页采用“左文右图”的非对称平衡布局，视觉重心始终在文字标题上。

2. **排版美学 (Typography)**
   - **中文字体**: 引入 Google Fonts 的 `Noto Serif SC` (思源宋体)，营造沉浸式的书卷气。
   - **代码字体**: 使用 `JetBrains Mono`，保证技术内容的专业度。
   - **对齐强迫症**: 面包屑、标题、元数据、正文严格遵循左侧垂直对齐，像素级修正了浏览器默认的缩进误差。

3. **极简交互 (Micro Interactions)**
   - 目录 (TOC) 悬浮于右侧，仅在需要时通过极简的文字按钮唤起。
   - 移动端自动适配为单栏布局，图片上移，目录隐藏，保证小屏阅读体验。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run dev
```
这将执行构建并启动本地服务器，访问 `http://localhost:3000` 即可预览。

### 3. 构建

```bash
npm run build
```
构建后的静态文件将生成在 `public` 目录下。

## 📝 写作指南

在 `content` 目录下创建 `.md` 文件即可开始写作。支持标准 Markdown 语法。

**Front Matter 格式示例：**

```yaml
---
title: 我的第一篇文章
date: 2023-10-27
category: 日常工作
tags: [生活, 随笔]
author: 惊羽
cover: https://example.com/image.jpg  # 可选，不填则自动提取正文第一张图
description: 这是文章的摘要... # 可选，不填则自动提取正文前150字
---

这里是正文内容...
```

## ⚙️ 配置

主要配置文件为根目录下的 `build.js`。你可以在这里修改：

- `config.siteTitle`: 博客标题
- `config.author`: 默认作者
- `config.navCategories`: 顶部导航栏显示的分类（数组格式，如 `['杂货铺', '数据仓库']`）。
  - **提示**：如果你想把某个分类放在导航栏的最右侧（例如作为“关于”或“归档”的入口），只需在数组中调整顺序即可。导航栏会严格按照你在这个数组中定义的顺序进行渲染。

## ☁️ 部署到 Cloudflare Pages

本项目非常适合部署到 Cloudflare Pages，完全免费且速度极快。

### 步骤 1: 推送到 GitHub

1. 在 GitHub 上创建一个新的仓库（例如 `my-blog`）。
2. 将本地代码推送到仓库：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/my-blog.git
git push -u origin main
```

### 步骤 2: 配置 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**。
3. 选择你刚才创建的 GitHub 仓库。
4. **构建配置 (Build settings)**：
   - **Framework preset**: 选择 `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `public`
5. 点击 **Save and Deploy**。

等待几秒钟，你的博客就上线了！Cloudflare 会分配一个二级域名（如 `my-blog.pages.dev`）。

## 🌐 绑定私人域名
127→
128→如果你有自己的域名，可以绑定到 Cloudflare Pages：
129→
130→1. 在 Cloudflare Pages 项目页面，点击 **Custom domains** 选项卡。
131→2. 点击 **Set up a custom domain**。
132→3. 输入你的域名。
133→4. Cloudflare 会提示你添加 DNS 记录：
134→   - 如果你的域名 DNS 已经在 Cloudflare 托管：它会自动添加记录，点击确认即可。
135→   - 如果在其他服务商（如阿里云、腾讯云）：去你的域名服务商后台，添加一条 `CNAME` 记录，指向 Cloudflare 提供的地址（例如 `my-blog.pages.dev`）。
136→5. 等待 DNS 生效（通常几分钟），访问你的域名即可看到博客！

---

🎉 Enjoy your writing!
