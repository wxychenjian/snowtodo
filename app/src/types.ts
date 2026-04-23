export type TodoStatus = 'pending' | 'completed' | 'archived'
export type Priority = 'low' | 'medium' | 'high'
export type ReminderType = 'none' | 'system' | 'popup' | 'both'
export type RepeatRule = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'
export type RecurringPattern = 'daily' | 'weekdays' | 'weekends' | 'custom'
export type PomodoroPhase = 'idle' | 'focus' | 'shortBreak' | 'longBreak'
export type ViewId =
  | 'today'
  | 'all'
  | 'upcoming'
  | 'completed'
  | 'categories'
  | 'tags'
  | 'reminders'
  | 'settings'
  | 'recurring'
  | 'pomodoro'
  | 'dashboard'
  | 'health'
  | 'timeblock'
  | 'ai'
  | 'projects'

// ================================================
// Pomodoro (番茄钟)
// ================================================
export interface PomodoroSession {
  id: string
  todoId: string | null
  startTime: string
  endTime: string | null
  duration: number            // 实际专注时长（分钟）
  plannedDuration: number     // 计划时长（分钟）
  completed: boolean
  interruptCount: number
  interruptReason: string | null
  workType: 'deep' | 'shallow'
}

export interface PomodoroSettings {
  focusDuration: number       // 专注时长（分钟）
  shortBreakDuration: number  // 短休息时长
  longBreakDuration: number   // 长休息时长
  longBreakInterval: number   // 长休息周期（几个番茄后）
  autoComplete: boolean       // 连续完成N个番茄后自动标记完成
  soundEnabled: boolean       // 声音提醒
  globalShortcut: string      // 全局快捷键
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoComplete: false,
  soundEnabled: true,
  globalShortcut: 'Ctrl+Shift+P',
}

// ================================================
// Health Reminder (健康提醒)
// ================================================
export interface HealthReminder {
  id: string
  name: string
  icon: string
  message: string
  enabled: boolean
  triggerType: 'interval' | 'fixed'
  intervalMinutes: number | null
  fixedTime: string | null    // HH:mm
  fixedDays: number[]         // [0=周日, 1=周一, ...]
  notifyType: 'notification' | 'popup' | 'both'
  skipDuringPomodoro: boolean
  workdaysOnly: boolean
  weekendsOnly: boolean
  holidayAutoOff: boolean
  sortOrder: number
}

export interface ReminderHistoryEntry {
  id: string
  reminderId: string
  triggeredAt: string
  responded: boolean
  snoozed: boolean
  snoozedMinutes: number | null
}

export const DEFAULT_HEALTH_REMINDERS: Omit<HealthReminder, 'id' | 'sortOrder'>[] = [
  { name: '喝水提醒', icon: '💧', message: '该喝水啦！保持水分有助于保持专注', enabled: true, triggerType: 'interval', intervalMinutes: 60, fixedTime: null, fixedDays: [], notifyType: 'notification', skipDuringPomodoro: true, workdaysOnly: false, weekendsOnly: false, holidayAutoOff: false },
  { name: '活动提醒', icon: '🧘', message: '站起来活动一下吧，伸个懒腰~', enabled: true, triggerType: 'interval', intervalMinutes: 90, fixedTime: null, fixedDays: [], notifyType: 'notification', skipDuringPomodoro: true, workdaysOnly: false, weekendsOnly: false, holidayAutoOff: false },
  { name: '眼保健操', icon: '👀', message: '让眼睛休息一下吧，做个眼保健操', enabled: false, triggerType: 'fixed', intervalMinutes: null, fixedTime: '14:00', fixedDays: [], notifyType: 'notification', skipDuringPomodoro: true, workdaysOnly: false, weekendsOnly: false, holidayAutoOff: false },
  { name: '深呼吸', icon: '🌬️', message: '深呼吸3次，放松一下身心', enabled: false, triggerType: 'interval', intervalMinutes: 45, fixedTime: null, fixedDays: [], notifyType: 'notification', skipDuringPomodoro: true, workdaysOnly: false, weekendsOnly: false, holidayAutoOff: false },
  { name: '番茄休息', icon: '🍅', message: '番茄钟结束！休息一下吧', enabled: true, triggerType: 'interval', intervalMinutes: 30, fixedTime: null, fixedDays: [], notifyType: 'both', skipDuringPomodoro: false, workdaysOnly: false, weekendsOnly: false, holidayAutoOff: false },
  { name: '下班提醒', icon: '🌙', message: '该下班了，别忘了回顾今日计划', enabled: true, triggerType: 'fixed', intervalMinutes: null, fixedTime: '18:00', fixedDays: [1, 2, 3, 4, 5], notifyType: 'notification', skipDuringPomodoro: true, workdaysOnly: true, weekendsOnly: false, holidayAutoOff: true },
  { name: '吃药提醒', icon: '💊', message: '该吃药了', enabled: false, triggerType: 'fixed', intervalMinutes: null, fixedTime: '08:00', fixedDays: [], notifyType: 'both', skipDuringPomodoro: false, workdaysOnly: false, weekendsOnly: false, holidayAutoOff: false },
]

// ================================================
// Time Block (时间块)
// ================================================
export interface TimeBlock {
  id: string
  todoId: string | null
  title: string
  startTime: string
  endTime: string
  color: string | null
  categoryId: string | null
  isAllDay: boolean
  notes: string | null
  actualPomodoros: number
}

// ================================================
// AI Settings (AI 智能助手)
// ================================================
export interface AISettings {
  provider: 'openai' | 'claude' | 'qwen' | 'wenxin' | 'custom'
  apiUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  proxy: string | null
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

// ================================================
// Daily Stats (每日统计)
// ================================================
export interface DailyStats {
  id: string
  date: string
  completedCount: number
  totalFocusMinutes: number
  deepWorkMinutes: number
  pomodoroCount: number
  interruptCount: number
}

export interface Category {
  id: string
  name: string
  sortOrder: number
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  createdAt: string
}

export interface Settings {
  launchOnStartup: boolean
  defaultSort: 'dueSoon' | 'createdDesc' | 'priority'
  defaultReminderType: ReminderType
  compactMode: boolean
}

export interface Todo {
  id: string
  title: string
  notes: string
  status: TodoStatus
  priority: Priority
  categoryId: string | null
  dueDate: string | null
  dueTime: string | null
  startDate: string | null   // 开始日期：到了这一天才在「今日待办」中出现
  isPinned: boolean
  repeatRule: RepeatRule
  customDays: number[] // 自定义重复时的星期选择 (0=周日, 1=周一, ...)
  reminderEnabled: boolean
  reminderType: ReminderType
  remindAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  tagIds: string[]
}

export interface TodoDraft {
  id?: string
  title: string
  notes: string
  priority: Priority
  categoryId: string | null
  dueDate: string | null
  dueTime: string | null
  startDate?: string | null  // 开始日期
  isPinned: boolean
  repeatRule: RepeatRule
  customDays?: number[] // 自定义重复时的星期选择 (0=周日, 1=周一, ...)
  reminderEnabled: boolean
  reminderType: ReminderType
  remindAt: string | null
  tagIds: string[]
}

export interface BootstrapData {
  todos: Todo[]
  categories: Category[]
  tags: Tag[]
  settings: Settings
}

export interface ReminderEvent {
  todoId: string
  title: string
  notes: string
  dueLabel: string
  reminderType: ReminderType
}

// 长期每日待办（模板）
export interface RecurringTodo {
  id: string
  title: string
  notes: string
  priority: Priority
  categoryId: string | null
  tagIds: string[]
  // 重复规则
  pattern: RecurringPattern
  customDays: number[] // 0=周日, 1=周一, ... 6=周六
  // 提醒设置
  reminderEnabled: boolean
  reminderType: ReminderType
  reminderTime: string | null // "09:00" 格式
  // 状态
  isActive: boolean
  lastGeneratedAt: string | null // 上次生成实例的日期
  createdAt: string
  updatedAt: string
}

export interface RecurringTodoDraft {
  id?: string
  title: string
  notes: string
  priority: Priority
  categoryId: string | null
  tagIds: string[]
  pattern: RecurringPattern
  customDays: number[]
  reminderEnabled: boolean
  reminderType: ReminderType
  reminderTime: string | null
  isActive: boolean
}

// ================================================
// Todo Images
// ================================================
export interface TodoImage {
  id: string
  data: string    // base64
  mimeType: string
}

// ================================================
// Project Cells (项目格子)
// ================================================
export interface ProjectCell {
  id: string
  content: string
  images: string[]  // base64 array
  isAlert: boolean
}
