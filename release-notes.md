# SnowTodo v0.3.0 🎉

## ✨ 新功能

### 项目集合（全新模块）
- **月历视图** - 按月浏览，每日格子展示内容摘要与图片缩略图
- **日记录视图** - 点击任意日期进入详情，支持文字记录 + 图片上传
- **图片支持** - 拖拽/粘贴/点击上传图片，hover 悬浮预览，点击 Lightbox 查看原图
- **格子置红** - 月视图直接右上角一键标记重点日期，无需进入详情
- **批量加载** - 进入月视图自动批量加载当月所有格子数据，无延迟

### 待办详情面板
- **图片附件** - 待办详情支持添加图片，支持拖拽/粘贴，Lightbox 全屏预览
- **面板关闭修复** - 关闭详情面板时自动清空图片预览，不再残留

### 其他改进
- **主题系统** - 完善多主题 CSS 变量覆盖
- 版本号升至 0.3.0

## 📦 Assets

| 文件名 | 说明 | 大小 |
|--------|------|------|
| `SnowTodo-0.3.0-x64.exe` | Windows 安装包（NSIS） | ~102MB |

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/wxychenjian/snowtodo.git

# 安装依赖
cd snowtodo/app
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 📝 技术栈

- **Electron** - 跨平台桌面应用框架
- **React** - UI 组件库
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **SQLite (sql.js)** - 本地数据库
- **Zustand** - 状态管理

---

**Full Changelog**: [v0.1.0...v0.3.0](https://github.com/wxychenjian/snowtodo/compare/v0.1.0...v0.3.0)
