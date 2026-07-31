# 聚合拾遗 (Archive Assistant)

个人知识归档的 Web 应用，以「六部」古风分类体系整理网页、文档和笔记。支持 AI 智能归纳、Canvas 奏折阅读、拖拽导入。

## 功能

| 模块 | 说明 |
|------|------|
| 六部主题 | 吏·名籍 / 户·府库 / 礼·典章 / 兵·行令 / 刑·稽核 / 工·营造（支持自定义） |
| 条目管理 | 新增、编辑、删除、搜索、类型过滤 |
| AI 智能归纳 | 输入内容 → AI 自动归类主题、提取标题和摘要 |
| 拖拽导入 | 拖入 PDF / Markdown / TXT / 图片，自动提取内容 |
| 奏折阅读器 | Canvas 2D 古风折页，翻页动画 |
| 数据备份 | JSON 一键导出/导入，自动快照（10 份轮替） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev       # 默认 http://localhost:5173

# 生产构建
npm run build     # 输出到 dist/
```

## AI 引擎配置

进入设置页（⚙ 图标），选择引擎类型并填写配置：

| 引擎 | 类型 | Endpoint 示例 |
|------|------|--------------|
| OpenAI | OPENAI_COMPATIBLE | `https://api.openai.com/v1` |
| DeepSeek | OPENAI_COMPATIBLE | `https://api.deepseek.com/v1` |
| Anthropic | ANTHROPIC | `https://api.anthropic.com` |
| Gemini | GEMINI | `https://generativelanguage.googleapis.com` |
| Ollama (本地) | OPENAI_COMPATIBLE | `http://localhost:11434/v1` |

支持的引擎类型：`OPENAI_COMPATIBLE` / `OPENAI_RESPONSES` / `ANTHROPIC` / `GEMINI`

## 部署

### Vercel（推荐）

```
npm install -g vercel
vercel --prod
```

已配置 `vercel.json`（SPA 路由 fallback + 静态资源缓存）。

### Cloudflare Pages

1. 连接 GitHub 仓库
2. 构建命令：`npm run build`
3. 输出目录：`dist`

### 静态文件服务

```bash
npm run build
npx serve dist
```

## 技术栈

- **前端框架**：React 19 + TypeScript 6
- **构建工具**：Vite 8
- **状态管理**：Zustand 5
- **持久化**：IndexedDB via Dexie.js 4
- **路由**：React Router 7
- **PDF 解析**：pdfjs-dist 4
- **AI 接口**：支持 OpenAI Chat Completions / Responses / Anthropic Messages / Gemini generateContent

## 项目结构

```
src/
├── models/          # 领域类型（Topic / Item / AiSettings）
├── store/           # Zustand 状态管理（ui / topic / item / ai）
├── lib/
│   ├── db.ts        # Dexie.js 数据库 + 导入导出
│   └── ai/
│       ├── transport.ts    # 四种 AI API 请求构建
│       └── classifier.ts   # 智能归纳 + 网页抓取
└── ui/
    ├── theme/       # 宣纸色系 tokens + 古风字体
    ├── layout/      # 响应式面板（Container Queries）
    ├── screens/     # HomePane / DetailPane / SettingsPane / AddItemDialog
    ├── components/  # ErrorBoundary / ArchiveDialog
    └── memorial/    # Canvas 2D 奏折阅读器
```

## 字体

| 字体 | 用途 | 许可 |
|------|------|------|
| 马善政体 | 标题 | OFL 1.1 |
| 定列宋体 | 正文 | 待核实 |
| 三极行楷简体粗体 | 标题 | 待核实 |