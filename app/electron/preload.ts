import { contextBridge, ipcRenderer } from 'electron'
import type {
  AISettings,
  BootstrapData,
  Category,
  HealthReminder,
  PomodoroSession,
  PomodoroSettings,
  RecurringTodo,
  RecurringTodoDraft,
  ReminderEvent,
  Settings,
  Tag,
  TimeBlock,
  TodoDraft,
} from '../src/types'

contextBridge.exposeInMainWorld('todoApi', {
  // ── Bootstrap ─────────────────────────────────────────────────────────
  getBootstrapData: () => ipcRenderer.invoke('todo:get-bootstrap'),

  // ── Todo CRUD ─────────────────────────────────────────────────────────
  saveTodo: (todo: TodoDraft) => ipcRenderer.invoke('todo:save', todo),
  toggleTodo: (todoId: string, completed: boolean) => ipcRenderer.invoke('todo:toggle', { todoId, completed }),
  deleteTodo: (todoId: string) => ipcRenderer.invoke('todo:delete', todoId),
  restoreTodo: (todoId: string) => ipcRenderer.invoke('todo:restore', todoId),

  // ── Category / Tag ────────────────────────────────────────────────────
  createCategory: (name: string) => ipcRenderer.invoke('category:create', name),
  createTag: (name: string) => ipcRenderer.invoke('tag:create', name),

  // ── Settings ──────────────────────────────────────────────────────────
  updateSettings: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:update', patch),

  // ── Data Export / Import ──────────────────────────────────────────────
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),

  // ── Window ────────────────────────────────────────────────────────────
  windowAction: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.invoke('window:action', action),

  // ── Reminder Events ───────────────────────────────────────────────────
  onReminderTriggered: (callback: (event: ReminderEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ReminderEvent) => callback(payload)
    ipcRenderer.on('reminder:triggered', listener)
    return () => ipcRenderer.removeListener('reminder:triggered', listener)
  },

  // ── Recurring Todos ───────────────────────────────────────────────────
  getRecurringTodos: () => ipcRenderer.invoke('recurring:get-all'),
  createRecurringTodo: (draft: RecurringTodoDraft) => ipcRenderer.invoke('recurring:create', draft),
  updateRecurringTodo: (id: string, draft: Partial<RecurringTodoDraft>) => ipcRenderer.invoke('recurring:update', { id, draft }),
  deleteRecurringTodo: (id: string) => ipcRenderer.invoke('recurring:delete', id),
  generateDailyTodos: () => ipcRenderer.invoke('recurring:generate-daily'),

  // ── M1 Pomodoro ───────────────────────────────────────────────────────
  getPomodoroSettings: () => ipcRenderer.invoke('pomodoro:get-settings'),
  updatePomodoroSettings: (patch: Partial<PomodoroSettings>) => ipcRenderer.invoke('pomodoro:update-settings', patch),
  createPomodoroSession: (session: Omit<PomodoroSession, 'id'>) => ipcRenderer.invoke('pomodoro:create-session', session),
  updatePomodoroSession: (id: string, patch: Partial<PomodoroSession>) => ipcRenderer.invoke('pomodoro:update-session', { id, patch }),
  getPomodoroSessions: (opts: { todoId?: string; date?: string; limit?: number }) => ipcRenderer.invoke('pomodoro:get-sessions', opts),
  getTodayPomodoroSessions: () => ipcRenderer.invoke('pomodoro:get-today-sessions'),
  setPomodoroActive: (active: boolean) => ipcRenderer.invoke('pomodoro:set-active', active),
  onPomodoroToggle: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('pomodoro:toggle', listener)
    return () => ipcRenderer.removeListener('pomodoro:toggle', listener)
  },
  onPomodoroActiveChanged: (callback: (active: boolean) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, active: boolean) => callback(active)
    ipcRenderer.on('pomodoro:active-changed', listener)
    return () => ipcRenderer.removeListener('pomodoro:active-changed', listener)
  },

  // ── M3 Health Reminders ───────────────────────────────────────────────
  getHealthReminders: () => ipcRenderer.invoke('health:get-reminders'),
  createHealthReminder: (reminder: Omit<HealthReminder, 'id'>) => ipcRenderer.invoke('health:create-reminder', reminder),
  updateHealthReminder: (id: string, patch: Partial<HealthReminder>) => ipcRenderer.invoke('health:update-reminder', { id, patch }),
  deleteHealthReminder: (id: string) => ipcRenderer.invoke('health:delete-reminder', id),
  getHealthReminderHistory: (opts: { reminderId?: string; limit?: number }) => ipcRenderer.invoke('health:get-history', opts),
  snoozeHealthReminder: (id: string, minutes: number) => ipcRenderer.invoke('health:snooze-reminder', { id, minutes }),
  dismissHealthReminder: (id: string) => ipcRenderer.invoke('health:dismiss-reminder', id),
  onHealthReminderTriggered: (callback: (reminder: HealthReminder) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, reminder: HealthReminder) => callback(reminder)
    ipcRenderer.on('health-reminder:triggered', listener)
    return () => ipcRenderer.removeListener('health-reminder:triggered', listener)
  },

  // ── M5 AI Settings ────────────────────────────────────────────────────
  getAISettings: () => ipcRenderer.invoke('ai:get-settings'),
  updateAISettings: (patch: Partial<AISettings>) => ipcRenderer.invoke('ai:update-settings', patch),

  // ── M6 Time Blocks ────────────────────────────────────────────────────
  getTimeBlocks: (date: string) => ipcRenderer.invoke('timeblock:get-all', date),
  createTimeBlock: (block: Omit<TimeBlock, 'id'>) => ipcRenderer.invoke('timeblock:create', block),
  updateTimeBlock: (id: string, patch: Partial<TimeBlock>) => ipcRenderer.invoke('timeblock:update', { id, patch }),
  deleteTimeBlock: (id: string) => ipcRenderer.invoke('timeblock:delete', id),

  // ── M4 Stats ──────────────────────────────────────────────────────────
  getDailyStats: (startDate: string, endDate: string) => ipcRenderer.invoke('stats:get-daily', { startDate, endDate }),
  updateDailyStats: (patch: Record<string, unknown>) => ipcRenderer.invoke('stats:update-daily', patch),
})
