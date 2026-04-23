import { create } from 'zustand'
import type {
  AISettings,
  BootstrapData,
  Category,
  DailyStats,
  HealthReminder,
  PomodoroPhase,
  PomodoroSession,
  PomodoroSettings,
  RecurringTodo,
  RecurringTodoDraft,
  ReminderEvent,
  Settings,
  Tag,
  TimeBlock,
  Todo,
  TodoDraft,
  ProjectCell,
  ViewId,
} from '../types'
import { DEFAULT_POMODORO_SETTINGS } from '../types'


export type { PomodoroPhase }

// ================================================
// Types
// ================================================
interface AppState {
  // ── Base Data ──────────────────────────────────
  todos: Todo[]
  recurringTodos: RecurringTodo[]
  categories: Category[]
  tags: Tag[]
  settings: Settings

  // ── UI State ───────────────────────────────────
  currentView: ViewId
  selectedTodoId: string | null
  selectedRecurringTodoId: string | null
  isDetailPanelOpen: boolean
  isRecurringPanelOpen: boolean
  searchQuery: string
  filterPriority: string | null
  filterCategoryId: string | null
  filterTagId: string | null
  sortBy: Settings['defaultSort']

  // ── Bootstrap ──────────────────────────────────
  isLoading: boolean
  isInitialized: boolean

  // ── M1 Pomodoro ────────────────────────────────
  pomodoroSettings: PomodoroSettings
  pomodoroPhase: PomodoroPhase
  pomodoroSecondsLeft: number
  pomodoroSession: number          // 当前第几个番茄
  pomodoroActiveTodoId: string | null
  pomodoroSessions: PomodoroSession[]
  todayPomodoroSessions: PomodoroSession[]

  // ── M3 Health ──────────────────────────────────
  healthReminders: HealthReminder[]
  pendingHealthReminder: HealthReminder | null  // 待确认的弹窗提醒

  // ── M5 AI ──────────────────────────────────────
  aiSettings: AISettings | null
  isAISettingsLoaded: boolean

  // ── M6 Time Block ──────────────────────────────
  timeBlocks: TimeBlock[]
  timeBlockDate: string   // 当前查看的日期 YYYY-MM-DD

  // ── M4 Dashboard ───────────────────────────────
  dailyStats: DailyStats[]

  // ── Projects ────────────────────────────────────
  projectCells: Record<string, ProjectCell>  // key: `${projectId}_${date}`
}

interface AppActions {
  // ── Bootstrap ──────────────────────────────────
  initialize: (data: BootstrapData) => void
  setLoading: (loading: boolean) => void

  // ── Navigation ─────────────────────────────────
  setCurrentView: (view: ViewId) => void

  // ── Todo CRUD ──────────────────────────────────
  setTodos: (todos: Todo[]) => void
  addTodo: (todo: Todo) => void
  updateTodo: (todo: Todo) => void
  removeTodo: (todoId: string) => void

  // ── Category / Tag ─────────────────────────────
  setCategories: (categories: Category[]) => void
  addCategory: (category: Category) => void
  setTags: (tags: Tag[]) => void
  addTag: (tag: Tag) => void

  // ── Recurring ──────────────────────────────────
  setRecurringTodos: (recurringTodos: RecurringTodo[]) => void
  addRecurringTodo: (recurringTodo: RecurringTodo) => void
  updateRecurringTodo: (recurringTodo: RecurringTodo) => void
  removeRecurringTodo: (recurringTodoId: string) => void
  openRecurringPanel: (recurringTodoId?: string) => void
  closeRecurringPanel: () => void
  loadRecurringTodos: () => Promise<void>

  // ── Settings ───────────────────────────────────
  setSettings: (settings: Settings) => void
  updateSettings: (patch: Partial<Settings>) => void

  // ── Detail Panel ───────────────────────────────
  openDetailPanel: (todoId?: string) => void
  closeDetailPanel: () => void

  // ── Filters ────────────────────────────────────
  setSearchQuery: (query: string) => void
  setFilterPriority: (priority: string | null) => void
  setFilterCategoryId: (categoryId: string | null) => void
  setFilterTagId: (tagId: string | null) => void
  setSortBy: (sort: Settings['defaultSort']) => void
  clearFilters: () => void

  // ── Computed ───────────────────────────────────
  getFilteredTodos: () => Todo[]
  getTodayTodos: () => Todo[]
  getUpcomingTodos: () => Todo[]
  getCompletedTodos: () => Todo[]
  getTodosByCategory: (categoryId: string) => Todo[]
  getTodosByTag: (tagId: string) => Todo[]
  getPendingReminders: () => Todo[]

  // ── M1 Pomodoro ────────────────────────────────
  loadPomodoroSettings: () => Promise<void>
  setPomodoroSettings: (settings: PomodoroSettings) => void
  setPomodoroPhase: (phase: PomodoroPhase) => void
  setPomodoroSecondsLeft: (seconds: number) => void
  tickPomodoro: () => void
  setPomodoroSession: (n: number) => void
  setPomodoroActiveTodoId: (id: string | null) => void
  addPomodoroSession: (session: PomodoroSession) => void
  setTodayPomodoroSessions: (sessions: PomodoroSession[]) => void
  loadTodayPomodoroSessions: () => Promise<void>

  // ── M3 Health ──────────────────────────────────
  loadHealthReminders: () => Promise<void>
  setHealthReminders: (reminders: HealthReminder[]) => void
  addHealthReminder: (reminder: HealthReminder) => void
  updateHealthReminderLocal: (reminder: HealthReminder) => void
  removeHealthReminder: (id: string) => void
  setPendingHealthReminder: (reminder: HealthReminder | null) => void

  // ── M5 AI ──────────────────────────────────────
  loadAISettings: () => Promise<void>
  setAISettings: (settings: AISettings) => void

  // ── M6 Time Block ──────────────────────────────
  setTimeBlocks: (blocks: TimeBlock[]) => void
  setTimeBlockDate: (date: string) => void
  loadTimeBlocks: (date: string) => Promise<void>
  addTimeBlock: (block: TimeBlock) => void
  updateTimeBlockLocal: (block: TimeBlock) => void
  removeTimeBlock: (id: string) => void

  // ── M4 Dashboard ───────────────────────────────
  setDailyStats: (stats: DailyStats[]) => void
  loadDailyStats: (startDate: string, endDate: string) => Promise<void>

  // ── Projects ────────────────────────────────────
  loadProjectMonth: (projectId: string, yearMonth: string) => Promise<void>
  loadProjectCell: (projectId: string, cellDate: string) => Promise<void>
  upsertProjectCell: (projectId: string, cellDate: string, content: string, images: string[], isAlert: boolean) => Promise<void>
}

// ================================================
// Store
// ================================================
export const useAppStore = create<AppState & AppActions>((set, get) => ({
  // ── Initial State ──────────────────────────────
  todos: [],
  recurringTodos: [],
  categories: [],
  tags: [],
  settings: {
    launchOnStartup: false,
    defaultSort: 'dueSoon',
    defaultReminderType: 'system',
    compactMode: false,
  },

  currentView: 'today',
  selectedTodoId: null,
  selectedRecurringTodoId: null,
  isDetailPanelOpen: false,
  isRecurringPanelOpen: false,
  searchQuery: '',
  filterPriority: null,
  filterCategoryId: null,
  filterTagId: null,
  sortBy: 'dueSoon',
  isLoading: true,
  isInitialized: false,

  // Pomodoro
  pomodoroSettings: DEFAULT_POMODORO_SETTINGS,
  pomodoroPhase: 'idle',
  pomodoroSecondsLeft: DEFAULT_POMODORO_SETTINGS.focusDuration * 60,
  pomodoroSession: 0,
  pomodoroActiveTodoId: null,
  pomodoroSessions: [],
  todayPomodoroSessions: [],

  // Health
  healthReminders: [],
  pendingHealthReminder: null,

  // AI
  aiSettings: null,
  isAISettingsLoaded: false,

  // TimeBlock
  timeBlocks: [],
  timeBlockDate: new Date().toISOString().slice(0, 10),

  // Dashboard
  dailyStats: [],

  // Projects
  projectCells: {},

  // ================================================
  // Bootstrap
  // ================================================
  initialize: (data) =>
    set({
      todos: data.todos,
      categories: data.categories,
      tags: data.tags,
      settings: data.settings,
      sortBy: data.settings.defaultSort,
      isLoading: false,
      isInitialized: true,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  // ================================================
  // Navigation
  // ================================================
  setCurrentView: (view) =>
    set({
      currentView: view,
      filterCategoryId: view === 'categories' ? null : get().filterCategoryId,
      filterTagId: view === 'tags' ? null : get().filterTagId,
      selectedTodoId: null,
      isDetailPanelOpen: false,
    }),

  // ================================================
  // Todo CRUD
  // ================================================
  setTodos: (todos) => set({ todos }),
  addTodo: (todo) => set((s) => ({ todos: [todo, ...s.todos] })),
  updateTodo: (todo) =>
    set((s) => ({ todos: s.todos.map((t) => (t.id === todo.id ? todo : t)) })),
  removeTodo: (todoId) =>
    set((s) => ({
      todos: s.todos.map((t) => (t.id === todoId ? { ...t, status: 'archived' as const } : t)),
    })),

  // ================================================
  // Category / Tag
  // ================================================
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((s) => ({ categories: [...s.categories, category] })),
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((s) => ({ tags: [...s.tags, tag] })),

  // ================================================
  // Recurring
  // ================================================
  setRecurringTodos: (recurringTodos) => set({ recurringTodos }),
  addRecurringTodo: (rt) => set((s) => ({ recurringTodos: [rt, ...s.recurringTodos] })),
  updateRecurringTodo: (rt) =>
    set((s) => ({ recurringTodos: s.recurringTodos.map((r) => (r.id === rt.id ? rt : r)) })),
  removeRecurringTodo: (id) =>
    set((s) => ({ recurringTodos: s.recurringTodos.filter((r) => r.id !== id) })),
  openRecurringPanel: (id) =>
    set({ selectedRecurringTodoId: id ?? null, isRecurringPanelOpen: true }),
  closeRecurringPanel: () =>
    set({ isRecurringPanelOpen: false, selectedRecurringTodoId: null }),
  loadRecurringTodos: async () => {
    const recurringTodos = await window.todoApi.getRecurringTodos()
    set({ recurringTodos })
  },

  // ================================================
  // Settings
  // ================================================
  setSettings: (settings) => set({ settings }),
  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),

  // ================================================
  // Detail Panel
  // ================================================
  openDetailPanel: (todoId) => set({ selectedTodoId: todoId ?? null, isDetailPanelOpen: true }),
  closeDetailPanel: () => set({ isDetailPanelOpen: false, selectedTodoId: null }),

  // ================================================
  // Filters
  // ================================================
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
  setFilterCategoryId: (categoryId) => set({ filterCategoryId: categoryId }),
  setFilterTagId: (tagId) => set({ filterTagId: tagId }),
  setSortBy: (sort) => set({ sortBy: sort }),
  clearFilters: () =>
    set({ searchQuery: '', filterPriority: null, filterCategoryId: null, filterTagId: null }),

  // ================================================
  // Computed
  // ================================================
  getFilteredTodos: () => {
    const { todos, searchQuery, filterPriority, filterCategoryId, filterTagId, sortBy } = get()
    let filtered = todos.filter((t) => t.status === 'pending')
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q))
    }
    if (filterPriority) filtered = filtered.filter((t) => t.priority === filterPriority)
    if (filterCategoryId) filtered = filtered.filter((t) => t.categoryId === filterCategoryId)
    if (filterTagId) filtered = filtered.filter((t) => t.tagIds.includes(filterTagId))
    return sortTodos(filtered, sortBy)
  },

  getTodayTodos: () => {
    const { todos, sortBy } = get()
    const today = new Date().toISOString().slice(0, 10)
    return sortTodos(
      todos.filter((t) => {
        if (t.status !== 'pending') return false
        // 未来开始的待办不显示
        if (t.startDate && t.startDate > today) return false
        return t.dueDate && t.dueDate <= today
      }),
      sortBy
    )
  },

  getUpcomingTodos: () => {
    const { todos, sortBy } = get()
    const today = new Date().toISOString().slice(0, 10)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return sortTodos(
      todos.filter((t) => t.status === 'pending' && t.dueDate && t.dueDate > today && t.dueDate <= nextWeek),
      sortBy
    )
  },

  getCompletedTodos: () => {
    const { todos } = get()
    return todos
      .filter((t) => t.status === 'completed')
      .sort((a, b) => new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime())
  },

  getTodosByCategory: (categoryId) => {
    const { todos, sortBy } = get()
    // 分类视图需要同时展示待办和已完成的任务
    return sortTodos(todos.filter((t) => t.categoryId === categoryId), sortBy)
  },

  getTodosByTag: (tagId) => {
    const { todos, sortBy } = get()
    return sortTodos(todos.filter((t) => t.tagIds.includes(tagId)), sortBy)
  },

  getPendingReminders: () => {
    const { todos } = get()
    const now = new Date()
    return todos.filter((t) => {
      if (t.status !== 'pending' || !t.reminderEnabled || !t.remindAt) return false
      return new Date(t.remindAt) <= now
    })
  },

  // ================================================
  // M1 Pomodoro
  // ================================================
  loadPomodoroSettings: async () => {
    const settings = await window.todoApi.getPomodoroSettings()
    set({ pomodoroSettings: settings, pomodoroSecondsLeft: settings.focusDuration * 60 })
  },
  setPomodoroSettings: (settings) => set({ pomodoroSettings: settings }),
  setPomodoroPhase: (phase) => {
    const { pomodoroSettings } = get()
    let seconds = pomodoroSettings.focusDuration * 60
    if (phase === 'shortBreak') seconds = pomodoroSettings.shortBreakDuration * 60
    if (phase === 'longBreak') seconds = pomodoroSettings.longBreakDuration * 60
    set({ pomodoroPhase: phase, pomodoroSecondsLeft: seconds })
  },
  setPomodoroSecondsLeft: (seconds) => set({ pomodoroSecondsLeft: seconds }),
  tickPomodoro: () =>
    set((s) => ({ pomodoroSecondsLeft: Math.max(0, s.pomodoroSecondsLeft - 1) })),
  setPomodoroSession: (n) => set({ pomodoroSession: n }),
  setPomodoroActiveTodoId: (id) => set({ pomodoroActiveTodoId: id }),
  addPomodoroSession: (session) =>
    set((s) => ({
      pomodoroSessions: [session, ...s.pomodoroSessions],
      todayPomodoroSessions: [session, ...s.todayPomodoroSessions],
    })),
  setTodayPomodoroSessions: (sessions) => set({ todayPomodoroSessions: sessions }),
  loadTodayPomodoroSessions: async () => {
    const sessions = await window.todoApi.getTodayPomodoroSessions()
    set({ todayPomodoroSessions: sessions })
  },

  // ================================================
  // M3 Health
  // ================================================
  loadHealthReminders: async () => {
    const reminders = await window.todoApi.getHealthReminders()
    set({ healthReminders: reminders })
  },
  setHealthReminders: (reminders) => set({ healthReminders: reminders }),
  addHealthReminder: (reminder) =>
    set((s) => ({ healthReminders: [...s.healthReminders, reminder] })),
  updateHealthReminderLocal: (reminder) =>
    set((s) => ({
      healthReminders: s.healthReminders.map((r) => (r.id === reminder.id ? reminder : r)),
    })),
  removeHealthReminder: (id) =>
    set((s) => ({ healthReminders: s.healthReminders.filter((r) => r.id !== id) })),
  setPendingHealthReminder: (reminder) => set({ pendingHealthReminder: reminder }),

  // ================================================
  // M5 AI
  // ================================================
  loadAISettings: async () => {
    const settings = await window.todoApi.getAISettings()
    set({ aiSettings: settings, isAISettingsLoaded: true })
  },
  setAISettings: (settings) => set({ aiSettings: settings }),

  // ================================================
  // M6 Time Block
  // ================================================
  setTimeBlocks: (blocks) => set({ timeBlocks: blocks }),
  setTimeBlockDate: (date) => set({ timeBlockDate: date }),
  loadTimeBlocks: async (date) => {
    const blocks = await window.todoApi.getTimeBlocks(date)
    set({ timeBlocks: blocks, timeBlockDate: date })
  },
  addTimeBlock: (block) => set((s) => ({ timeBlocks: [...s.timeBlocks, block] })),
  updateTimeBlockLocal: (block) =>
    set((s) => ({ timeBlocks: s.timeBlocks.map((b) => (b.id === block.id ? block : b)) })),
  removeTimeBlock: (id) =>
    set((s) => ({ timeBlocks: s.timeBlocks.filter((b) => b.id !== id) })),

  // ================================================
  // M4 Dashboard
  // ================================================
  setDailyStats: (stats) => set({ dailyStats: stats }),
  loadDailyStats: async (startDate, endDate) => {
    const stats = await window.todoApi.getDailyStats(startDate, endDate)
    set({ dailyStats: stats })
  },

  // ── Projects ────────────────────────────────────
  loadProjectMonth: async (projectId, yearMonth) => {
    const cells = await window.todoApi.getProjectCellsByMonth(projectId, yearMonth)
    const patch: Record<string, ProjectCell> = {}
    for (const cell of cells) {
      patch[`${projectId}_${cell.cellDate}`] = {
        id: cell.id,
        content: cell.content,
        images: cell.images,
        isAlert: cell.isAlert,
      }
    }
    set((s) => ({ projectCells: { ...s.projectCells, ...patch } }))
  },

  loadProjectCell: async (projectId, cellDate) => {
    const key = `${projectId}_${cellDate}`
    const cell = await window.todoApi.getProjectCell(projectId, cellDate)
    set((s) => ({
      projectCells: cell
        ? { ...s.projectCells, [key]: cell }
        : s.projectCells,
    }))
  },

  upsertProjectCell: async (projectId, cellDate, content, images, isAlert) => {
    const key = `${projectId}_${cellDate}`
    await window.todoApi.upsertProjectCell(projectId, cellDate, content, images, isAlert)
    set((s) => ({
      projectCells: {
        ...s.projectCells,
        [key]: { id: key, content, images, isAlert },
      },
    }))
  },
}))

// ================================================
// Helpers
// ================================================
function sortTodos(todos: Todo[], sortBy: Settings['defaultSort']): Todo[] {
  const pinned = todos.filter((t) => t.isPinned)
  const unpinned = todos.filter((t) => !t.isPinned)

  const sortFn = (a: Todo, b: Todo): number => {
    switch (sortBy) {
      case 'dueSoon':
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      case 'createdDesc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'priority': {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.priority] - order[b.priority]
      }
      default:
        return 0
    }
  }

  return [...pinned.sort(sortFn), ...unpinned.sort(sortFn)]
}

// ================================================
// Type declarations for window
// ================================================
declare global {
  interface Window {
    todoApi: {
      // Base
      getBootstrapData: () => Promise<BootstrapData>
      saveTodo: (todo: TodoDraft) => Promise<Todo>
      toggleTodo: (todoId: string, completed: boolean) => Promise<Todo>
      deleteTodo: (todoId: string) => Promise<void>
      restoreTodo: (todoId: string) => Promise<Todo>
      createCategory: (name: string) => Promise<Category>
      createTag: (name: string) => Promise<Tag>
      updateSettings: (patch: Partial<Settings>) => Promise<BootstrapData>
      exportData: () => Promise<void>
      importData: () => Promise<BootstrapData | null>
      windowAction: (action: 'minimize' | 'maximize' | 'close') => Promise<void>
      onReminderTriggered: (callback: (event: ReminderEvent) => void) => () => void
      // Recurring
      getRecurringTodos: () => Promise<RecurringTodo[]>
      createRecurringTodo: (draft: RecurringTodoDraft) => Promise<RecurringTodo>
      updateRecurringTodo: (id: string, draft: Partial<RecurringTodoDraft>) => Promise<RecurringTodo>
      deleteRecurringTodo: (id: string) => Promise<void>
      generateDailyTodos: () => Promise<number>
      // M1 Pomodoro
      getPomodoroSettings: () => Promise<PomodoroSettings>
      updatePomodoroSettings: (patch: Partial<PomodoroSettings>) => Promise<PomodoroSettings>
      createPomodoroSession: (session: Omit<PomodoroSession, 'id'>) => Promise<PomodoroSession>
      updatePomodoroSession: (id: string, patch: Partial<PomodoroSession>) => Promise<PomodoroSession>
      getPomodoroSessions: (opts: { todoId?: string; date?: string; limit?: number }) => Promise<PomodoroSession[]>
      getTodayPomodoroSessions: () => Promise<PomodoroSession[]>
      setPomodoroActive: (active: boolean) => Promise<void>
      onPomodoroToggle: (callback: () => void) => () => void
      onPomodoroActiveChanged: (callback: (active: boolean) => void) => () => void
      // M3 Health
      getHealthReminders: () => Promise<HealthReminder[]>
      createHealthReminder: (reminder: Omit<HealthReminder, 'id'>) => Promise<HealthReminder>
      updateHealthReminder: (id: string, patch: Partial<HealthReminder>) => Promise<HealthReminder>
      deleteHealthReminder: (id: string) => Promise<void>
      getHealthReminderHistory: (opts: { reminderId?: string; limit?: number }) => Promise<unknown[]>
      snoozeHealthReminder: (id: string, minutes: number) => Promise<void>
      dismissHealthReminder: (id: string) => Promise<void>
      onHealthReminderTriggered: (callback: (reminder: HealthReminder) => void) => () => void
      // M5 AI
      getAISettings: () => Promise<AISettings>
      updateAISettings: (patch: Partial<AISettings>) => Promise<AISettings>
      // M6 Time Block
      getTimeBlocks: (date: string) => Promise<TimeBlock[]>
      createTimeBlock: (block: Omit<TimeBlock, 'id'>) => Promise<TimeBlock>
      updateTimeBlock: (id: string, patch: Partial<TimeBlock>) => Promise<TimeBlock>
      deleteTimeBlock: (id: string) => Promise<void>
      // M4 Stats
      getDailyStats: (startDate: string, endDate: string) => Promise<DailyStats[]>
      updateDailyStats: (patch: Record<string, unknown>) => Promise<void>
      // Todo Images
      getTodoImages: (todoId: string) => Promise<{ id: string; data: string; mimeType: string }[]>
      addTodoImage: (todoId: string, data: string, mimeType: string) => Promise<string>
      deleteTodoImage: (imageId: string) => Promise<void>
      // Project Cells
      getProjectCellsByMonth: (projectId: string, yearMonth: string) => Promise<{ id: string; cellDate: string; content: string; images: string[]; isAlert: boolean }[]>
      getProjectCell: (projectId: string, cellDate: string) => Promise<ProjectCell | null>
      upsertProjectCell: (projectId: string, cellDate: string, content: string, images: string[], isAlert: boolean) => Promise<void>
    }
  }
}
