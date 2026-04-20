# SnowTodo

<div align="center">

![Platform](https://img.shields.io/badge/Platform-Windows-blue?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-41.2.1-47848F?style=flat-square&logo=electron)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**一款面向知识工作者的本地待办应用 · 番茄钟 · 数据仪表盘 · 健康提醒 · AI 智能助手**

[English](README.md) · [功能介绍](#功能特性) · [快速开始](#快速开始) · [开发指南](#开发指南) · [构建发布](#构建发布)

</div>

---

## 功能特性

### 🍅 番茄工作法
- 环形计时器，专注时长可自定义（15/20/25/30/45/60分钟）
- 关联任务 ID，自动记录工时到对应待办
- 全局快捷键 `Ctrl+Shift+P` 快速启动/暂停
- 打断记录：次数 + 原因标签
- 区分深度工作（≥ 3 番茄）和浅工作

### 📊 数据仪表盘
- 本周完成率环形图 / 近 7 天完成任务柱状图
- 今日累计专注时长、连续专注天数
- 分类任务分布饼图
- 支持「今日/本周/本月/本季度」时间范围切换

### 💪 健康小助手
- 间隔提醒（喝水/活动/眼保健操等）+ 固定时间提醒
- 番茄钟专注时智能延迟提醒
- 系统通知 + 弹窗双模式
- 工作日/周末分别配置

### 🤖 AI 智能助手
- 接入 OpenAI 兼容 API（配置 API 地址 + Key 即可）
- 任务智能拆分 / 优先级建议 / 效率洞察 / 周报生成
- 当前任务上下文自动注入到对话

### ⏰ 时间块视图
- 日视图时间轴（64px/hour）
- 当前时间指示线实时定位
- 任务与时间块双向关联

### 📋 基础待办管理
- 多视图：今天 / 全部 / 即将到期 / 已完成 / 分类 / 标签
- 优先级 + 分类 + 标签 + 到期日
- SQLite 本地持久化，数据完全自主可控

---

## 界面预览

> ![image-20260420111642617](.\images\image1.png)
>
> ![image-20260420111755789](.\images\image2.png)

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Electron](https://www.electronjs.org/) 41.x |
| 前端框架 | [React](https://react.dev/) 19.x + [TypeScript](https://www.typescriptlang.org/) 6.x |
| 构建工具 | [Vite](https://vitejs.dev/) 8.x + [electron-builder](https://www.electron.build/) |
| 状态管理 | [Zustand](https://zustand-demo.pmnd.rs/) 5.x |
| 数据库 | [sql.js](https://sql.js.org/) (SQLite in WebAssembly) |
| 图标 | [Lucide React](https://lucide.dev/) |
| 时间处理 | [dayjs](https://day.js.org/) |

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x 或 **pnpm** ≥ 8.x
- **Windows** 10/11（当前仅打包 Windows 版）

### 安装依赖

```bash
cd app
npm install
```

### 开发模式

```bash
npm run dev
```

> Vite 开发服务器启动后，Electron 主进程同步运行，支持热更新。

### 类型检查

```bash
npm run typecheck
```

### 构建

```bash
npm run build
```

构建产物输出到项目根目录 `dist/`：
- `SnowTodo-x.x.x-x64-setup.exe` — NSIS 安装包
- `SnowTodo-x.x.x-x64.exe` — 免安装便携版

---

## 项目结构

```
todo-electron/
├── app/                          # 源代码根目录
│   ├── electron/
│   │   ├── main.ts               # Electron 主进程（IPC handlers）
│   │   ├── preload.ts            # 预加载脚本（安全桥接 API）
│   │   └── db.ts                 # SQLite 数据库操作层
│   ├── src/
│   │   ├── App.tsx               # 根组件
│   │   ├── main.tsx              # React 入口
│   │   ├── types.ts              # 全局类型定义
│   │   ├── store/
│   │   │   └── useAppStore.ts    # Zustand 全局状态管理
│   │   ├── components/
│   │   │   ├── Sidebar/          # 侧边栏导航
│   │   │   ├── Content/          # 主内容区（待办列表/空状态）
│   │   │   ├── DetailPanel/      # 待办详情编辑面板
│   │   │   ├── Settings/         # 设置页面
│   │   │   ├── Pomodoro/         # 番茄钟模块
│   │   │   ├── Dashboard/        # 数据仪表盘
│   │   │   ├── Health/           # 健康提醒
│   │   │   ├── AI/               # AI 智能助手
│   │   │   └── TimeBlock/        # 时间块视图
│   │   └── styles/
│   │       └── design-system.css # CSS 设计系统（CSS Variables 主题）
│   ├── package.json
│   └── vite.config.ts
├── dist/                         # 构建产物（自动生成）
├── SnowTodo_Pro PRD.md           # 产品需求文档
└── README.md
```

---

## 开发指南

### 添加新模块

1. 在 `src/types.ts` 中定义类型
2. 在 `src/store/useAppStore.ts` 中添加 state / actions
3. 在 `electron/db.ts` 中实现数据持久化（如需要）
4. 在 `electron/main.ts` 中注册 IPC handler
5. 在 `electron/preload.ts` 中暴露 API
6. 创建组件于 `src/components/YourModule/`
7. 在 `src/components/Content/Content.tsx` 中添加路由分支
8. 在 `src/components/Sidebar/Sidebar.tsx` 中添加导航入口

### 样式规范

- 所有颜色使用 CSS Variables（定义在 `design-system.css` 的 `:root`）
- 组件样式文件放在组件目录下 `*.module.css` 或独立 `*.css`
- 避免直接写死颜色值

### 数据库

- 使用 `sql.js` 在浏览器/WASM 环境运行 SQLite
- 所有写操作通过 `electron/db.ts` 的 CRUD 函数
- 通过 Electron IPC（`ipcMain.handle` / `ipcRenderer.invoke`）调用

---

## 构建发布

### Windows 安装包

```bash
npm run build
```

产物位于 `dist/` 目录：

| 文件 | 说明 |
|------|------|
| `SnowTodo-x.x.x-x64-setup.exe` | NSIS 安装向导 |
| `SnowTodo-x.x.x-x64.exe` | 免安装便携版（直接运行） |

### 代码签名（如需）

```json
// package.json build.win.signAndEditExecutable 启用
// 需要配置 Windows 代码签名证书
```

---

## License

MIT © wangxy2
