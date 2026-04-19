# SnowTodo补充的需求文档


## 一、产品概述

### 1.1 产品定位

SnowTodo 是一款面向知识工作者的时间管理与健康生活助手，在待办任务管理的基础上，深度融合番茄工作法、数据可视化、健康提醒、AI 智能辅助等功能，帮助用户实现「专注高效」与「身心健康」的双重目标。

### 1.2 核心价值

- 🎯 **专注驱动**：番茄钟与待办深度融合，任务即目标，目标即专注
- 📊 **数据透明**：工作数据可视化，让每一分钟都有迹可循
- 💪 **健康守护**：可定制的健康提醒，构建可持续的工作节奏
- 🤖 **智能赋能**：接入大模型 AI，提供个性化工作建议
- 🎨 **视觉愉悦**：多主题动态壁纸，让工具本身成为享受

---

## 二、功能模块详细设计

---

### 模块一：番茄工作法 + 待办融合

#### 2.1.1 功能描述

将番茄工作法与待办任务系统深度整合，用户可以针对单个待办任务开启专注计时，完成后自动记录工时并更新任务状态。

#### 2.1.2 业务流程

```
[选择待办任务] → [开启番茄钟] → [25分钟专注] → [5分钟休息] → [循环/结束]
                        ↓                ↓
                   [关联任务ID]     [自动记录工时]
```

#### 2.1.3 功能清单

| 序号 | 功能点 | 描述 |
|------|--------|------|
| F1.1 | 番茄钟启动 | 从待办列表选中任务，点击「开始专注」按钮启动番茄钟 |
| F1.2 | 关联任务 | 番茄钟自动绑定当前任务ID，记录专注时长归属 |
| F1.3 | 计时显示 | 主界面悬浮计时器，显示剩余时间、当前任务名称 |
| F1.4 | 休息提醒 | 番茄钟结束弹出休息提醒（5分钟短休息 / 15分钟长休息） |
| F1.5 | 自动标记 | 可配置：连续完成4个番茄后自动标记任务为已完成 |
| F1.6 | 工时记录 | 每次专注完成记录工时（分钟），支持按日/周/月统计 |
| F1.7 | 深度工作时长 | 区分「浅工作」（< 3个番茄）和「深度工作」（≥ 3个番茄） |
| F1.8 | 打断处理 | 中断时记录打断次数及原因（可配置原因标签） |
| F1.9 | 快捷键 | 全局快捷键：Ctrl+Shift+P 快速启动/暂停番茄钟 |
| F1.10 | 系统通知 | 番茄开始/结束/休息时发送系统通知 |

#### 2.1.4 配置项

| 配置项 | 默认值 | 可选值 |
|--------|--------|--------|
| 专注时长 | 25分钟 | 15/20/25/30/45/60分钟 |
| 短休息时长 | 5分钟 | 3/5/10分钟 |
| 长休息时长 | 15分钟 | 10/15/20/30分钟 |
| 长休息周期 | 4个番茄 | 3/4/5/6个番茄 |
| 自动标记完成 | 关闭 | 开启/关闭 |
| 声音提醒 | 开启 | 开启/关闭 |
| 全局快捷键 | Ctrl+Shift+P | 自定义 |

#### 2.1.5 数据模型

```typescript
interface PomodoroSession {
  id: string;
  todoId: string;           // 关联的待办任务ID
  startTime: Date;
  endTime: Date;
  duration: number;         // 实际专注时长（分钟）
  plannedDuration: number;  // 计划时长
  completed: boolean;       // 是否完整完成
  interruptCount: number;  // 被打断次数
  interruptReason?: string;// 打断原因
  workType: 'deep' | 'shallow'; // 工作类型
}

interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoComplete: boolean;
  soundEnabled: boolean;
  globalShortcut: string;
}
```

---

### 模块二：工作台数据仪表盘

#### 2.2.1 功能描述

在欢迎工作台页面展示个人工作数据的可视化图表，包括任务完成率、工作时长趋势、效率洞察等，让用户对自己的工作状态一目了然。


#### 2.2.3 功能清单

| 序号 | 功能点 | 描述 |
|------|--------|------|
| F2.1 | 本周完成率 | 环形图显示本周已完成任务占总任务的比例 |
| F2.2 | 今日专注时长 | 数字卡片显示今日累计专注时长 |
| F2.3 | 连续专注天数 | 显示连续有专注记录的日期数 |
| F2.4 | 周任务趋势 | 柱状图展示近7天每日完成任务数 |
| F2.5 | 任务分类分布 | 饼图展示各分类（工作/个人/其他）的任务占比 |
| F2.6 | 时段效率分析 | 折线图展示不同时段的专注效率 |
| F2.7 | AI 效率洞察 | 基于数据生成自然语言效率分析 |
| F2.8 | 数据时间范围 | 支持切换「今日/本周/本月/本季度」 |
| F2.9 | 数据导出 | 导出为 CSV 格式的周报/月报 |
| F2.10 | 目标设定 | 设置每周任务完成目标，对比实际达成 |

#### 2.2.4 数据统计规则

| 指标 | 计算方式 |
|------|----------|
| 完成率 | 已完成任务数 / (已完成 + 未完成) × 100% |
| 专注时长 | 所有 PomodoroSession.completed=true 的 duration 之和 |
| 深度工作时长 | 单日专注时长 ≥ 3个番茄 的时长总和 |
| 效率指数 | (完成任务数 × 权重系数) / 实际工时 |

---

### 模块三：健康小助手（可自定义）

#### 2.3.1 功能描述

提供可高度自定义的健康提醒功能，帮助用户在工作过程中保持良好的生活习惯。用户可以根据个人需求添加、编辑、删除提醒项，设置提醒频率和提醒方式。

#### 2.3.2 默认提醒模板

| 提醒类型 | 默认时间 | 默认文案 | 可自定义 |
|----------|----------|----------|----------|
| 💧 喝水提醒 | 每60分钟 | "该喝水啦！保持水分有助于保持专注" | ✅ |
| 🧘 活动提醒 | 每90分钟 | "站起来活动一下吧，伸个懒腰~" | ✅ |
| 👀 眼保健操 | 下午2:00 | "让眼睛休息一下吧，做个眼保健操" | ✅ |
| 🌬️ 深呼吸 | 每45分钟 | "深呼吸3次，放松一下身心" | ✅ |
| 🍅 番茄休息 | 番茄钟结束 | "番茄钟结束！休息一下吧" | ✅ |
| 🌙 下班提醒 | 下午6:00 | "该下班了，别忘了回顾今日计划" | ✅ |
| 💊 吃药提醒 | 自定义 | "该吃药了" | ✅ |

#### 2.3.3 功能清单

| 序号 | 功能点 | 描述 |
|------|--------|------|
| F3.1 | 提醒列表管理 | 查看、添加、编辑、删除健康提醒项 |
| F3.2 | 提醒频率设置 | 支持「间隔分钟数」或「固定时间点」两种模式 |
| F3.3 | 提醒文案自定义 | 每个提醒可设置独立的文案 |
| F3.4 | 提醒方式选择 | 系统通知 / 弹窗 / 两者都支持 |
| F3.5 | 工作日/周末区分 | 可分别设置工作日和周末的提醒规则 |
| F3.6 | 智能跳过 | 检测到用户正在番茄钟专注时，延迟提醒 |
| F3.7 | 节假日模式 | 可设置节假日自动关闭所有提醒 |
| F3.8 | 启用/暂停 | 全局开关，一键暂停所有健康提醒 |
| F3.9 | 提醒历史 | 记录每次提醒的触发时间和用户响应 |
| F3.10 | 快速模板 | 提供常用提醒模板，一键添加 |


#### 2.3.5 数据模型

```typescript
interface HealthReminder {
  id: string;
  name: string;              // 提醒名称
  icon: string;              // 图标 emoji
  message: string;           // 提醒文案
  enabled: boolean;          // 是否启用
  
  // 触发规则（二选一）
  triggerType: 'interval' | 'fixed';
  intervalMinutes?: number;  // 间隔分钟数
  fixedTime?: string;        // 固定时间 HH:mm
  fixedDays?: number[];      // 适用星期 [0=周日, 1=周一, ...]
  
  // 提醒方式
  notifyType: 'notification' | 'popup' | 'both';
  
  // 智能跳过
  skipDuringPomodoro: boolean;
  
  // 生效日期
  workdaysOnly: boolean;     // 仅工作日
  weekendsOnly: boolean;     // 仅周末
  holidayAutoOff: boolean;   // 节假日自动关闭
}

interface ReminderHistory {
  id: string;
  reminderId: string;
  triggeredAt: Date;
  responded: boolean;        // 用户是否响应
  snoozed: boolean;          // 是否稍后提醒
  snoozedMinutes?: number;
}
```

---

### 模块四：时间块视图

#### 2.4.1 功能描述

提供类似 Notion/Calendar 的时间轴视图，用户可以将待办任务拖拽到具体时间段，以可视化的方式规划一天的时间分配。

#### 2.4.2 视图模式

| 视图模式 | 描述 | 适用场景 |
|----------|------|----------|
| 日视图 | 展示完整24小时，每小时一个刻度 | 详细规划单日 |
| 周视图 | 展示7天，每天显示时间条 | 周计划概览 |
| 3日视图 | 展示连续3天 | 中等粒度规划 |

#### 2.4.3 功能清单

| 序号 | 功能点 | 描述 |
|------|--------|------|
| F4.1 | 时间轴渲染 | 左侧时间刻度，右侧任务条 |
| F4.2 | 拖拽分配 | 将待办列表中的任务拖到时间轴 |
| F4.3 | 任务时长 | 根据预估时长自动设置任务条高度 |
| F4.4 | 任务颜色 | 根据分类自动着色，或用户自定义 |
| F4.5 | 时间段标注 | 支持添加「会议」「午休」等非任务块 |
| F4.6 | 今日高亮 | 当前时间线高亮显示 |
| F4.7 | 快速创建 | 双击空白时间段快速创建任务 |
| F4.8 | 任务详情 | 点击任务条查看/编辑详情 |
| F4.9 | 实际 vs 计划 | 对比计划时间块与实际番茄钟记录 |
| F4.10 | 批量操作 | 选中多个任务块，批量移动/删除 |

#### 2.4.5 数据模型

```typescript
interface TimeBlock {
  id: string;
  todoId?: string;           // 关联的待办任务（可选）
  title: string;
  startTime: Date;
  endTime: Date;
  color?: string;            // 自定义颜色
  categoryId?: string;       // 分类ID
  isAllDay: boolean;         // 全天事件
  notes?: string;            // 备注
  actualPomodoros?: number;   // 实际使用的番茄数
}
```

---

### 模块五：AI 智能助手

#### 2.5.1 功能描述

接入大语言模型 API，为用户提供智能工作建议、任务分析、日程优化等服务。所有配置由用户在设置页面管理，支持多种主流大模型。

#### 2.5.2 大模型配置（设置页面）

| 配置项 | 说明 |
|--------|------|
| API 类型 | OpenAI API / Claude API / 通义千问 / 文心一言 / 自定义 |
| API 地址 | API endpoint URL |
| API Key | API 密钥（加密存储） |
| 模型选择 | 根据 API 类型动态加载可用模型列表 |
| 最大 Token | 上下文窗口大小 |
| Temperature | 生成随机性（0-1） |
| 代理设置 | HTTP/HTTPS 代理（可选） |

#### 2.5.3 AI 功能清单

| 序号 | 功能点 | 描述 |
|------|--------|------|
| F5.1 | 智能任务拆分 | 输入复杂任务，AI 拆分为可执行子任务 |
| F5.2 | 优先级建议 | 基于截止时间和工作量，AI 推荐执行顺序 |
| F5.3 | 效率洞察 | 分析工作数据，提供个性化改进建议 |
| F5.4 | 智能摘要 | 对长文本任务内容生成摘要 |
| F5.5 | 任务建议 | 根据上下文推荐可能需要添加的任务 |
| F5.6 | 拖延诊断 | 分析任务拖延原因，给出对策 |
| F5.7 | 专注策略 | 基于用户习惯，推荐最佳专注时段 |
| F5.8 | 周报生成 | 自动汇总本周完成任务，生成周报草稿 |
| F5.9 | 对话助手 | 侧边栏 AI 对话窗口，随时提问 |
| F5.10 | 离线模式 | 无网络时提供本地基础建议 |


#### 2.5.5 AI 提示词模板

```markdown
## 任务拆分
你是一个任务拆解专家。请将以下复杂任务拆分为3-7个简单、可执行的子任务：
任务：{user_task}
要求：
1. 每个子任务应该能在25分钟内完成
2. 子任务之间有清晰的依赖顺序
3. 输出格式：序号 + 任务描述 + 预估时长

## 优先级建议
基于以下任务列表和约束条件，给出执行顺序建议：
任务列表：
{task_list}
截止时间：{deadlines}
请分析任务的重要性和紧迫性，给出推荐执行顺序及理由。

## 效率洞察
分析用户过去7天的工作数据：
- 完成任务数：{completed_count}
- 总专注时长：{focus_minutes}分钟
- 深度工作占比：{deep_work_ratio}%
- 打断次数：{interrupt_count}

请给出3条具体的效率改进建议。
```

---

### 模块六：多主题与动态壁纸

#### 2.6.1 功能描述

提供多套精心设计的视觉主题，支持随时间自动切换（日间/夜间模式），重要节日期间自动应用节日主题，让工具本身成为一种视觉享受。

#### 2.6.2 内置主题

| 主题名称 | 主色调 | 风格描述 | 适用场景 |
|----------|--------|----------|----------|
| 暖阳白（默认） | #FFF8F0 | 温暖米白，柔和护眼 | 日常办公 |
| 深空蓝 | #1A1D29 | 科技感深色，专注沉浸 | 夜间工作 |
| 樱花粉 | #FFF0F5 | 少女心粉色，温馨浪漫 | 个人休闲 |
| 森林绿 | #F0FFF4 | 自然清新，舒缓放松 | 阅读写作 |
| 极简灰 | #F5F5F5 | 黑白灰极简，干净利落 | 高效专注 |
| 商务蓝 | #E8F4FD | 沉稳商务，专业可信 | 正式场合 |

#### 2.6.3 节日主题

| 节日 | 主题名称 | 主色调 | 启用时间 |
|------|----------|--------|----------|
| 春节 | 新春红 | #DC143C | 农历腊月廿三 ~ 正月十五 |
| 元宵节 | 花灯夜 | #FFD700 | 正月十四 ~ 正月十六 |
| 清明节 | 春之和 | #98FB98 | 清明前后3天 |
| 端午节 | 端午绿 | #2E8B57 | 端午前后3天 |
| 中秋节 | 月圆夜 | #F4A460 | 中秋前后3天 |
| 国庆节 | 中国红 | #C41E3A | 10月1日 ~ 10月7日 |

#### 2.6.4 功能清单

| 序号 | 功能点 | 描述 |
|------|--------|------|
| F6.1 | 主题切换 | 一键切换预设主题，立即生效 |
| F6.2 | 自动切换 | 根据系统时间自动切换日间/夜间主题 |
| F6.3 | 节日主题 | 自动检测并应用节日主题（可关闭） |
| F6.4 | 自定义主题 | 用户可调整颜色、字体、圆角等 |
| F6.5 | 壁纸设置 | 设置背景图片或纯色背景 |
| F6.6 | 毛玻璃效果 | 背景图片 + 毛玻璃模糊效果 |
| F6.7 | 主题预览 | 在设置页面实时预览主题效果 |
| F6.8 | 导入/导出 | 导出自定义主题配置，导入他人主题 |
| F6.9 | 快捷切换 | 托盘菜单支持快速切换主题 |
| F6.10 | 跟随系统 | 可选择跟随 Windows/macOS 系统主题 |

#### 2.6.5 主题配置项

```typescript
interface ThemeConfig {
  id: string;
  name: string;
  isBuiltIn: boolean;
  
  // 颜色配置
  colors: {
    primary: string;          // 主色
    secondary: string;       // 辅助色
    accent: string;          // 强调色
    background: string;      // 背景色
    surface: string;         // 卡片/面板色
    text: string;            // 主文字色
    textSecondary: string;   // 次要文字色
    border: string;          // 边框色
    success: string;         // 成功色
    warning: string;         // 警告色
    error: string;           // 错误色
  };
  
  // 视觉效果
  effects: {
    blur: number;            // 模糊程度 0-20
    shadow: boolean;         // 是否启用阴影
    rounded: number;         // 圆角 0-20
  };
  
  // 背景
  wallpaper?: {
    type: 'color' | 'image';
    value: string;           // 颜色值或图片路径
    blur?: number;           // 模糊程度
    opacity?: number;        // 透明度
  };
  
  // 自动切换
  autoSwitch?: {
    enabled: boolean;
    dayTheme: string;        // 日间主题ID
    nightTheme: string;      // 夜间主题ID
    switchTime: {
      dayStart: string;      // 日间开始时间 HH:mm
      nightStart: string;    // 夜间开始时间 HH:mm
    };
  };
  
  // 节日主题
  holidayTheme?: {
    festival: string;        // 节日名称
    startDate: string;       // 开始日期 MM-DD
    endDate: string;         // 结束日期 MM-DD
  };
}
```

---

## 三、技术架构设计

### 3.1 技术选型

| 层级 | 技术方案 | 说明 |
|------|----------|------|
| 框架 | Electron + React + TypeScript | 跨平台桌面应用 |
| 构建 | Vite + electron-builder | 快速构建与打包 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 数据存储 | SQLite (sql.js) | 本地数据持久化 |
| UI 组件 | 自定义 CSS + CSS Variables | 主题系统支持 |
| 图表 | Chart.js / Recharts | 数据可视化 |
| AI | OpenAI API / Claude API | 大模型接入 |
| 系统集成 | Electron IPC | 系统通知、全局快捷键 |

### 3.2 模块依赖关系

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                           │
│  (主应用容器，路由与状态分发)                             │
└───────────────────────┬────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Sidebar      │ │  Content       │ │  DetailPanel  │
│  (侧边栏导航)  │ │  (主内容区)     │ │  (详情面板)    │
└───────┬───────┘ └───────┬───────┘ └───────────────┘
        │                 │
        ▼                 ▼
┌───────────────┐ ┌───────────────────────────────────┐
│ PomodoroTimer │ │        Dashboard                  │
│ (番茄钟组件)  │ │    (数据仪表盘组件)                 │
└───────────────┘ └───────────────────────────────────┘
        │
        ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ HealthReminder│ │  TimeBlock     │ │  AIAssistant  │
│ (健康提醒)     │ │  (时间块视图)   │ │  (AI助手)     │
└───────────────┘ └───────────────┘ └───────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│                    SettingsPage                        │
│  (设置页面 - 主题/番茄钟/健康提醒/AI配置)              │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│                     electron/                          │
│  main.ts | preload.ts | db.ts                          │
│  (主进程 | 预加载脚本 | 数据库操作)                      │
└───────────────────────────────────────────────────────┘
```

### 3.3 数据库表结构

```sql
-- 番茄钟会话表
CREATE TABLE pomodoro_sessions (
  id TEXT PRIMARY KEY,
  todo_id TEXT,
  start_time INTEGER,
  end_time INTEGER,
  duration INTEGER,
  planned_duration INTEGER,
  completed INTEGER DEFAULT 0,
  interrupt_count INTEGER DEFAULT 0,
  interrupt_reason TEXT,
  work_type TEXT,
  created_at INTEGER
);

-- 健康提醒表
CREATE TABLE health_reminders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  message TEXT,
  enabled INTEGER DEFAULT 1,
  trigger_type TEXT,
  interval_minutes INTEGER,
  fixed_time TEXT,
  fixed_days TEXT,
  notify_type TEXT,
  skip_during_pomodoro INTEGER DEFAULT 1,
  workdays_only INTEGER DEFAULT 0,
  weekends_only INTEGER DEFAULT 0,
  holiday_auto_off INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- 提醒历史表
CREATE TABLE reminder_history (
  id TEXT PRIMARY KEY,
  reminder_id TEXT,
  triggered_at INTEGER,
  responded INTEGER DEFAULT 0,
  snoozed INTEGER DEFAULT 0,
  snoozed_minutes INTEGER,
  FOREIGN KEY (reminder_id) REFERENCES health_reminders(id)
);

-- 时间块表
CREATE TABLE time_blocks (
  id TEXT PRIMARY KEY,
  todo_id TEXT,
  title TEXT NOT NULL,
  start_time INTEGER,
  end_time INTEGER,
  color TEXT,
  category_id TEXT,
  is_all_day INTEGER DEFAULT 0,
  notes TEXT,
  actual_pomodoros INTEGER DEFAULT 0
);

-- 主题配置表
CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config TEXT,
  is_built_in INTEGER DEFAULT 0,
  created_at INTEGER
);

-- AI 配置表
CREATE TABLE ai_settings (
  id INTEGER PRIMARY KEY,
  provider TEXT,
  api_url TEXT,
  api_key TEXT,
  model TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4000,
  proxy TEXT,
  features TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- 每日统计数据表（用于仪表盘）
CREATE TABLE daily_stats (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE,
  completed_count INTEGER DEFAULT 0,
  total_focus_minutes INTEGER DEFAULT 0,
  deep_work_minutes INTEGER DEFAULT 0,
  pomodoro_count INTEGER DEFAULT 0,
  interrupt_count INTEGER DEFAULT 0,
  created_at INTEGER
);
```

---

## 四、原型设计要点

### 4.1 番茄钟悬浮球

```
┌─────────────────────┐
│    🍅  25:00        │
│  ██████████████░░░ │
│  「撰写项目方案」    │
│  [⏸️ 暂停] [⏹️ 结束] │
└─────────────────────┘
        ↑
    可拖拽到屏幕任意位置
    右键菜单：设置/跳过休息/关闭
```

### 4.2 数据仪表盘卡片

```
┌──────────────────┐
│  📊 今日数据      │
├──────────────────┤
│  ⏱️ 专注时长       │
│    3h 25m        │
│    ↑ 25%         │
├──────────────────┤
│  ✅ 完成任务      │
│    8 个          │
│    ↑ 3          │
├──────────────────┤
│  🎯 完成率        │
│    80%           │
│  ▓▓▓▓▓▓▓▓▓░░░   │
└──────────────────┘
```

### 4.3 健康提醒弹窗

```
┌─────────────────────────────────────┐
│  💧 喝水提醒                         │
├─────────────────────────────────────┤
│                                     │
│     该喝水啦！保持水分有助于          │
│     保持专注                          │
│                                     │
│     今天已提醒: 3 次                  │
│                                     │
├─────────────────────────────────────┤
│  [✅ 知道了]  [⏰ 稍后 10 分钟]       │
└─────────────────────────────────────┘
```

---

## 五、优先级与里程碑

### 5.1 功能优先级

| 优先级 | 模块 | 理由 |
|--------|------|------|
| P0 | 番茄钟核心 | 产品差异化核心，需优先完成 |
| P0 | 主题系统 | 视觉体验基础，影响整体品质感 |
| P1 | 健康提醒 | 用户粘性强，实现相对简单 |
| P1 | 数据仪表盘 | 用户获得感强，激励持续使用 |
| P2 | AI 助手 | 技术复杂，可分阶段实现 |
| P2 | 时间块视图 | 高级功能，提升产品定位 |

### 5.2 里程碑规划

| 阶段 | 目标 | 主要交付物 |
|------|------|------------|
| M1 | 基础番茄钟 | PomodoroTimer 组件 + 设置项 |
| M2 | 主题系统 v1 | 6套预设主题 + 自动切换 |
| M3 | 健康提醒 v1 | 提醒管理 + 通知系统 |
| M4 | 数据仪表盘 | 核心指标卡片 + 趋势图表 |
| M5 | AI 助手 v1 | OpenAI 接入 + 基础建议功能 |
| M6 | 时间块视图 | 日视图 + 拖拽交互 |
| M7 | 完整集成 | 所有模块整合 + 细节打磨 |
