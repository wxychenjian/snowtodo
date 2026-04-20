import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type {
  AISettings,
  BootstrapData,
  Category,
  DailyStats,
  DEFAULT_HEALTH_REMINDERS,
  HealthReminder,
  RecurringTodo,
  RecurringTodoDraft,
  ReminderEvent,
  ReminderHistoryEntry,
  ReminderType,
  PomodoroSession,
  PomodoroSettings,
  Settings,
  Tag,
  TimeBlock,
  Todo,
  TodoDraft,
} from '../src/types'

const DB_FILE = 'snowtodo.db'

const DEFAULT_SETTINGS: Settings = {
  launchOnStartup: false,
  defaultSort: 'dueSoon',
  defaultReminderType: 'system',
  compactMode: false,
}

const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoComplete: false,
  soundEnabled: true,
  globalShortcut: 'Ctrl+Shift+P',
}

const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openai',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 4000,
  proxy: null,
}

export class AppDatabase {
  private sql!: SqlJsStatic
  private db!: Database
  private userDataPath = ''

  async init(userDataPath: string) {
    this.userDataPath = userDataPath

    // Locate sql-wasm.wasm - check multiple locations
    const isDev = !app.isPackaged
    let wasmPath: string

    if (isDev) {
      wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    } else {
      wasmPath = path.join(process.resourcesPath, 'sql-wasm.wasm')
    }

    // Initialize SQL.js with explicit wasm path
    this.sql = await initSqlJs({
      locateFile: () => wasmPath,
    })

    const dbPath = path.join(userDataPath, DB_FILE)

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      this.db = new this.sql.Database(buffer)
      // Run migrations for existing database
      this.runMigrations()
    } else {
      this.db = new this.sql.Database()
      this.createTables()
      this.insertDefaultData()
    }
  }

  private runMigrations() {
    // Migration: Add custom_days column to todos table if it doesn't exist
    try {
      const result = this.db.exec(
        "SELECT name FROM pragma_table_info('todos') WHERE name = 'custom_days'"
      )
      if (!result.length || result[0].values.length === 0) {
        this.db.run("ALTER TABLE todos ADD COLUMN custom_days TEXT DEFAULT '[]'")
        console.log('[DB] Migration: Added custom_days column to todos table')
      }
    } catch (err) {
      console.error('[DB] Migration error:', err)
    }

    // Migration: Add new tables for Pro features (idempotent)
    const newTables = [
      `CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id TEXT PRIMARY KEY,
        todo_id TEXT,
        start_time TEXT,
        end_time TEXT,
        duration INTEGER DEFAULT 0,
        planned_duration INTEGER DEFAULT 25,
        completed INTEGER DEFAULT 0,
        interrupt_count INTEGER DEFAULT 0,
        interrupt_reason TEXT,
        work_type TEXT DEFAULT 'shallow'
      )`,
      `CREATE TABLE IF NOT EXISTS health_reminders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '💧',
        message TEXT,
        enabled INTEGER DEFAULT 1,
        trigger_type TEXT DEFAULT 'interval',
        interval_minutes INTEGER,
        fixed_time TEXT,
        fixed_days TEXT DEFAULT '[]',
        notify_type TEXT DEFAULT 'notification',
        skip_during_pomodoro INTEGER DEFAULT 1,
        workdays_only INTEGER DEFAULT 0,
        weekends_only INTEGER DEFAULT 0,
        holiday_auto_off INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS reminder_history (
        id TEXT PRIMARY KEY,
        reminder_id TEXT NOT NULL,
        triggered_at TEXT,
        responded INTEGER DEFAULT 0,
        snoozed INTEGER DEFAULT 0,
        snoozed_minutes INTEGER,
        FOREIGN KEY (reminder_id) REFERENCES health_reminders(id)
      )`,
      `CREATE TABLE IF NOT EXISTS time_blocks (
        id TEXT PRIMARY KEY,
        todo_id TEXT,
        title TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        color TEXT,
        category_id TEXT,
        is_all_day INTEGER DEFAULT 0,
        notes TEXT,
        actual_pomodoros INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS themes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        is_built_in INTEGER DEFAULT 0,
        created_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ai_settings (
        id INTEGER PRIMARY KEY,
        provider TEXT DEFAULT 'openai',
        api_url TEXT,
        api_key TEXT,
        model TEXT,
        temperature REAL DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 4000,
        proxy TEXT,
        created_at TEXT,
        updated_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS daily_stats (
        id TEXT PRIMARY KEY,
        date TEXT UNIQUE,
        completed_count INTEGER DEFAULT 0,
        total_focus_minutes INTEGER DEFAULT 0,
        deep_work_minutes INTEGER DEFAULT 0,
        pomodoro_count INTEGER DEFAULT 0,
        interrupt_count INTEGER DEFAULT 0,
        created_at TEXT
      )`,
    ]

    for (const sql of newTables) {
      try {
        this.db.run(sql)
      } catch (err) {
        console.error('[DB] Migration table creation error:', err)
      }
    }

    // Add new indexes
    try {
      this.db.run('CREATE INDEX IF NOT EXISTS idx_pomodoro_todo ON pomodoro_sessions(todo_id)')
      this.db.run('CREATE INDEX IF NOT EXISTS idx_pomodoro_start ON pomodoro_sessions(start_time)')
      this.db.run('CREATE INDEX IF NOT EXISTS idx_timeblock_start ON time_blocks(start_time)')
      this.db.run('CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date)')
      this.db.run('CREATE INDEX IF NOT EXISTS idx_health_enabled ON health_reminders(enabled)')
    } catch (err) {
      console.error('[DB] Migration index error:', err)
    }

    // Insert default health reminders if table is empty
    try {
      const count = this.db.exec('SELECT COUNT(*) FROM health_reminders')
      if (!count[0]?.values?.[0]?.[0] || (count[0].values[0][0] as number) === 0) {
        this.insertDefaultHealthReminders()
      }
    } catch (err) {
      console.error('[DB] Migration health reminders error:', err)
    }

    // Insert built-in themes if table is empty
    try {
      const count = this.db.exec('SELECT COUNT(*) FROM themes')
      if (!count[0]?.values?.[0]?.[0] || (count[0].values[0][0] as number) === 0) {
        this.insertDefaultThemes()
      }
    } catch (err) {
      console.error('[DB] Migration themes error:', err)
    }

    // Insert default AI settings if table is empty
    try {
      const count = this.db.exec('SELECT COUNT(*) FROM ai_settings')
      if (!count[0]?.values?.[0]?.[0] || (count[0].values[0][0] as number) === 0) {
        this.insertDefaultAISettings()
      }
    } catch (err) {
      console.error('[DB] Migration AI settings error:', err)
    }

    // Insert pomodoro settings into settings table if not present
    try {
      const ps = this.db.exec("SELECT value FROM settings WHERE key = 'pomodoroSettings'")
      if (!ps[0]?.values?.length) {
        this.db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [
          'pomodoroSettings',
          JSON.stringify(DEFAULT_POMODORO_SETTINGS),
        ])
        this.save()
      }
    } catch (err) {
      console.error('[DB] Migration pomodoro settings error:', err)
    }

    // Insert theme ID setting if not present
    try {
      const ts = this.db.exec("SELECT value FROM settings WHERE key = 'currentThemeId'")
      if (!ts[0]?.values?.length) {
        this.db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [
          'currentThemeId',
          JSON.stringify('theme-warmwhite'),
        ])
        this.save()
      }
    } catch (err) {
      console.error('[DB] Migration theme setting error:', err)
    }

    console.log('[DB] Migrations completed')
  }

  private createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        category_id TEXT,
        due_date TEXT,
        due_time TEXT,
        is_pinned INTEGER DEFAULT 0,
        repeat_rule TEXT DEFAULT 'none',
        custom_days TEXT DEFAULT '[]',
        reminder_enabled INTEGER DEFAULT 0,
        reminder_type TEXT DEFAULT 'none',
        remind_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS todo_tags (
        todo_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (todo_id, tag_id),
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reminder_logs (
        id TEXT PRIMARY KEY,
        todo_id TEXT NOT NULL,
        triggered_at TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT DEFAULT 'success',
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recurring_todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        priority TEXT DEFAULT 'medium',
        category_id TEXT,
        pattern TEXT DEFAULT 'daily',
        custom_days TEXT DEFAULT '[]',
        reminder_enabled INTEGER DEFAULT 0,
        reminder_type TEXT DEFAULT 'system',
        reminder_time TEXT,
        is_active INTEGER DEFAULT 1,
        last_generated_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS recurring_todo_tags (
        recurring_todo_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (recurring_todo_id, tag_id),
        FOREIGN KEY (recurring_todo_id) REFERENCES recurring_todos(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
      CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
      CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category_id);
      CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_todos(is_active);

      CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id TEXT PRIMARY KEY,
        todo_id TEXT,
        start_time TEXT,
        end_time TEXT,
        duration INTEGER DEFAULT 0,
        planned_duration INTEGER DEFAULT 25,
        completed INTEGER DEFAULT 0,
        interrupt_count INTEGER DEFAULT 0,
        interrupt_reason TEXT,
        work_type TEXT DEFAULT 'shallow'
      );

      CREATE TABLE IF NOT EXISTS health_reminders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '💧',
        message TEXT,
        enabled INTEGER DEFAULT 1,
        trigger_type TEXT DEFAULT 'interval',
        interval_minutes INTEGER,
        fixed_time TEXT,
        fixed_days TEXT DEFAULT '[]',
        notify_type TEXT DEFAULT 'notification',
        skip_during_pomodoro INTEGER DEFAULT 1,
        workdays_only INTEGER DEFAULT 0,
        weekends_only INTEGER DEFAULT 0,
        holiday_auto_off INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS reminder_history (
        id TEXT PRIMARY KEY,
        reminder_id TEXT NOT NULL,
        triggered_at TEXT,
        responded INTEGER DEFAULT 0,
        snoozed INTEGER DEFAULT 0,
        snoozed_minutes INTEGER,
        FOREIGN KEY (reminder_id) REFERENCES health_reminders(id)
      );

      CREATE TABLE IF NOT EXISTS time_blocks (
        id TEXT PRIMARY KEY,
        todo_id TEXT,
        title TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        color TEXT,
        category_id TEXT,
        is_all_day INTEGER DEFAULT 0,
        notes TEXT,
        actual_pomodoros INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS themes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        is_built_in INTEGER DEFAULT 0,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS ai_settings (
        id INTEGER PRIMARY KEY,
        provider TEXT DEFAULT 'openai',
        api_url TEXT,
        api_key TEXT,
        model TEXT,
        temperature REAL DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 4000,
        proxy TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS daily_stats (
        id TEXT PRIMARY KEY,
        date TEXT UNIQUE,
        completed_count INTEGER DEFAULT 0,
        total_focus_minutes INTEGER DEFAULT 0,
        deep_work_minutes INTEGER DEFAULT 0,
        pomodoro_count INTEGER DEFAULT 0,
        interrupt_count INTEGER DEFAULT 0,
        created_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_pomodoro_todo ON pomodoro_sessions(todo_id);
      CREATE INDEX IF NOT EXISTS idx_pomodoro_start ON pomodoro_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_timeblock_start ON time_blocks(start_time);
      CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
      CREATE INDEX IF NOT EXISTS idx_health_enabled ON health_reminders(enabled);
    `)
  }

  private insertDefaultData() {
    const now = new Date().toISOString()
    const categories = [
      { id: 'cat-work', name: '工作', sortOrder: 1 },
      { id: 'cat-life', name: '生活', sortOrder: 2 },
      { id: 'cat-study', name: '学习', sortOrder: 3 },
    ]
    for (const cat of categories) {
      this.db.run(
        'INSERT INTO categories (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
        [cat.id, cat.name, cat.sortOrder, now]
      )
    }

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      this.db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [
        key,
        JSON.stringify(value),
      ])
    }

    // Pomodoro settings
    this.db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [
      'pomodoroSettings',
      JSON.stringify(DEFAULT_POMODORO_SETTINGS),
    ])

    // Current theme
    this.db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [
      'currentThemeId',
      JSON.stringify('theme-warmwhite'),
    ])

    this.insertDefaultHealthReminders()
    this.insertDefaultThemes()
    this.insertDefaultAISettings()
  }

  private insertDefaultHealthReminders() {
    const reminders = [
      { id: 'hr-water', name: '喝水提醒', icon: '💧', message: '该喝水啦！保持水分有助于保持专注', enabled: 1, triggerType: 'interval', intervalMinutes: 60, fixedTime: null, fixedDays: '[]', notifyType: 'notification', skipPomodoro: 1, workdaysOnly: 0, weekendsOnly: 0, holidayOff: 0, sortOrder: 1 },
      { id: 'hr-activity', name: '活动提醒', icon: '🧘', message: '站起来活动一下吧，伸个懒腰~', enabled: 1, triggerType: 'interval', intervalMinutes: 90, fixedTime: null, fixedDays: '[]', notifyType: 'notification', skipPomodoro: 1, workdaysOnly: 0, weekendsOnly: 0, holidayOff: 0, sortOrder: 2 },
      { id: 'hr-eye', name: '眼保健操', icon: '👀', message: '让眼睛休息一下吧，做个眼保健操', enabled: 0, triggerType: 'fixed', intervalMinutes: null, fixedTime: '14:00', fixedDays: '[]', notifyType: 'notification', skipPomodoro: 1, workdaysOnly: 0, weekendsOnly: 0, holidayOff: 0, sortOrder: 3 },
      { id: 'hr-breathe', name: '深呼吸', icon: '🌬️', message: '深呼吸3次，放松一下身心', enabled: 0, triggerType: 'interval', intervalMinutes: 45, fixedTime: null, fixedDays: '[]', notifyType: 'notification', skipPomodoro: 1, workdaysOnly: 0, weekendsOnly: 0, holidayOff: 0, sortOrder: 4 },
      { id: 'hr-pomobreak', name: '番茄休息', icon: '🍅', message: '番茄钟结束！休息一下吧', enabled: 1, triggerType: 'interval', intervalMinutes: 30, fixedTime: null, fixedDays: '[]', notifyType: 'both', skipPomodoro: 0, workdaysOnly: 0, weekendsOnly: 0, holidayOff: 0, sortOrder: 5 },
      { id: 'hr-offwork', name: '下班提醒', icon: '🌙', message: '该下班了，别忘了回顾今日计划', enabled: 1, triggerType: 'fixed', intervalMinutes: null, fixedTime: '18:00', fixedDays: '[1,2,3,4,5]', notifyType: 'notification', skipPomodoro: 1, workdaysOnly: 1, weekendsOnly: 0, holidayOff: 1, sortOrder: 6 },
      { id: 'hr-medicine', name: '吃药提醒', icon: '💊', message: '该吃药了', enabled: 0, triggerType: 'fixed', intervalMinutes: null, fixedTime: '08:00', fixedDays: '[]', notifyType: 'both', skipPomodoro: 0, workdaysOnly: 0, weekendsOnly: 0, holidayOff: 0, sortOrder: 7 },
    ]
    for (const r of reminders) {
      this.db.run(
        `INSERT OR IGNORE INTO health_reminders (id, name, icon, message, enabled, trigger_type, interval_minutes, fixed_time, fixed_days, notify_type, skip_during_pomodoro, workdays_only, weekends_only, holiday_auto_off, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.icon, r.message, r.enabled, r.triggerType, r.intervalMinutes, r.fixedTime, r.fixedDays, r.notifyType, r.skipPomodoro, r.workdaysOnly, r.weekendsOnly, r.holidayOff, r.sortOrder]
      )
    }
  }

  private insertDefaultThemes() {
    const now = new Date().toISOString()
    const themes = [
      {
        id: 'theme-warmwhite', name: '暖阳白', isBuiltIn: 1,
        config: JSON.stringify({
          colors: { primary: '#4a7c59', secondary: '#6b6660', accent: '#4a7c59', background: '#faf9f7', surface: '#ffffff', text: '#2d2a26', textSecondary: '#6b6660', border: '#e8e5e0', success: '#4a7c59', warning: '#c49c4a', error: '#c45c4a' },
          effects: { blur: 0, shadow: true, rounded: 8 },
        }),
      },
      {
        id: 'theme-deepblue', name: '深空蓝', isBuiltIn: 1,
        config: JSON.stringify({
          colors: { primary: '#6c8ebf', secondary: '#8899aa', accent: '#6c8ebf', background: '#1a1d29', surface: '#252836', text: '#e0e0e0', textSecondary: '#8899aa', border: '#333648', success: '#5cb85c', warning: '#f0ad4e', error: '#d9534f' },
          effects: { blur: 0, shadow: true, rounded: 8 },
        }),
      },
      {
        id: 'theme-sakura', name: '樱花粉', isBuiltIn: 1,
        config: JSON.stringify({
          colors: { primary: '#d4738a', secondary: '#b08888', accent: '#d4738a', background: '#fff0f5', surface: '#fff8fa', text: '#4a3040', textSecondary: '#8a6070', border: '#f0d0d8', success: '#6a9a6a', warning: '#c49c4a', error: '#c45c4a' },
          effects: { blur: 0, shadow: true, rounded: 12 },
        }),
      },
      {
        id: 'theme-forest', name: '森林绿', isBuiltIn: 1,
        config: JSON.stringify({
          colors: { primary: '#2e7d32', secondary: '#5a7a5a', accent: '#2e7d32', background: '#f0fff4', surface: '#f8fff8', text: '#1b3a1b', textSecondary: '#5a7a5a', border: '#c8e6c9', success: '#2e7d32', warning: '#c49c4a', error: '#c45c4a' },
          effects: { blur: 0, shadow: true, rounded: 8 },
        }),
      },
      {
        id: 'theme-minimal', name: '极简灰', isBuiltIn: 1,
        config: JSON.stringify({
          colors: { primary: '#424242', secondary: '#757575', accent: '#424242', background: '#f5f5f5', surface: '#ffffff', text: '#212121', textSecondary: '#757575', border: '#e0e0e0', success: '#4caf50', warning: '#ff9800', error: '#f44336' },
          effects: { blur: 0, shadow: false, rounded: 4 },
        }),
      },
      {
        id: 'theme-business', name: '商务蓝', isBuiltIn: 1,
        config: JSON.stringify({
          colors: { primary: '#1565c0', secondary: '#5a7a9a', accent: '#1565c0', background: '#e8f4fd', surface: '#f0f7ff', text: '#1a2a3a', textSecondary: '#5a7a9a', border: '#c0d8f0', success: '#2e7d32', warning: '#f57c00', error: '#c62828' },
          effects: { blur: 0, shadow: true, rounded: 6 },
        }),
      },
    ]
    for (const t of themes) {
      this.db.run(
        'INSERT OR IGNORE INTO themes (id, name, config, is_built_in, created_at) VALUES (?, ?, ?, ?, ?)',
        [t.id, t.name, t.config, t.isBuiltIn, now]
      )
    }
  }

  private insertDefaultAISettings() {
    const now = new Date().toISOString()
    this.db.run(
      'INSERT INTO ai_settings (provider, api_url, api_key, model, temperature, max_tokens, proxy, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [DEFAULT_AI_SETTINGS.provider, DEFAULT_AI_SETTINGS.apiUrl, '', DEFAULT_AI_SETTINGS.model, DEFAULT_AI_SETTINGS.temperature, DEFAULT_AI_SETTINGS.maxTokens, null, now, now]
    )
  }

  private save() {
    const data = this.db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(path.join(this.userDataPath, DB_FILE), buffer)
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  private rowToTodo(row: unknown[]): Todo {
    const tagRows = this.db.exec(
      'SELECT tag_id FROM todo_tags WHERE todo_id = ?',
      [row[0]]
    )
    const tagIds = tagRows[0]?.values?.map((r) => r[0] as string) ?? []
    const customDaysStr = row[10] as string
    const customDays = customDaysStr ? JSON.parse(customDaysStr) as number[] : []
    return {
      id: row[0] as string,
      title: row[1] as string,
      notes: row[2] as string,
      status: row[3] as Todo['status'],
      priority: row[4] as Todo['priority'],
      categoryId: row[5] as string | null,
      dueDate: row[6] as string | null,
      dueTime: row[7] as string | null,
      isPinned: Boolean(row[8]),
      repeatRule: row[9] as Todo['repeatRule'],
      customDays,
      reminderEnabled: Boolean(row[11]),
      reminderType: row[12] as Todo['reminderType'],
      remindAt: row[13] as string | null,
      completedAt: row[14] as string | null,
      createdAt: row[15] as string,
      updatedAt: row[16] as string,
      tagIds,
    }
  }

  getBootstrapData(): BootstrapData {
    const todosResult = this.db.exec(
      'SELECT id, title, notes, status, priority, category_id, due_date, due_time, is_pinned, repeat_rule, custom_days, reminder_enabled, reminder_type, remind_at, completed_at, created_at, updated_at FROM todos ORDER BY is_pinned DESC, created_at DESC'
    )
    const todos: Todo[] = todosResult[0]?.values.map((row) =>
      this.rowToTodo(row)
    ) ?? []

    const catsResult = this.db.exec(
      'SELECT id, name, sort_order, created_at FROM categories ORDER BY sort_order'
    )
    const categories: Category[] =
      catsResult[0]?.values.map((row) => ({
        id: row[0] as string,
        name: row[1] as string,
        sortOrder: row[2] as number,
        createdAt: row[3] as string,
      })) ?? []

    const tagsResult = this.db.exec(
      'SELECT id, name, created_at FROM tags ORDER BY name'
    )
    const tags: Tag[] =
      tagsResult[0]?.values.map((row) => ({
        id: row[0] as string,
        name: row[1] as string,
        createdAt: row[2] as string,
      })) ?? []

    const settings: Settings = { ...DEFAULT_SETTINGS }
    const settingsResult = this.db.exec('SELECT key, value FROM settings')
    for (const row of settingsResult[0]?.values ?? []) {
      const key = row[0] as keyof Settings
      const value = JSON.parse(row[1] as string)
      ;(settings as Record<string, unknown>)[key] = value
    }

    return { todos, categories, tags, settings }
  }

  saveTodo(draft: TodoDraft): Todo {
    const now = new Date().toISOString()
    const id = draft.id ?? this.generateId()

    const existing = draft.id
      ? this.db.exec('SELECT id FROM todos WHERE id = ?', [draft.id])
      : null

    const customDaysJson = JSON.stringify(draft.customDays ?? [])

    if (existing && existing[0]?.values?.length) {
      this.db.run(
        `UPDATE todos SET
          title = ?, notes = ?, priority = ?, category_id = ?,
          due_date = ?, due_time = ?, is_pinned = ?, repeat_rule = ?,
          custom_days = ?, reminder_enabled = ?, reminder_type = ?, remind_at = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          draft.title,
          draft.notes,
          draft.priority,
          draft.categoryId,
          draft.dueDate,
          draft.dueTime,
          draft.isPinned ? 1 : 0,
          draft.repeatRule,
          customDaysJson,
          draft.reminderEnabled ? 1 : 0,
          draft.reminderType,
          draft.remindAt,
          now,
          id,
        ]
      )
    } else {
      this.db.run(
        `INSERT INTO todos (
          id, title, notes, status, priority, category_id,
          due_date, due_time, is_pinned, repeat_rule, custom_days,
          reminder_enabled, reminder_type, remind_at,
          completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          id,
          draft.title,
          draft.notes,
          draft.priority,
          draft.categoryId,
          draft.dueDate,
          draft.dueTime,
          draft.isPinned ? 1 : 0,
          draft.repeatRule,
          customDaysJson,
          draft.reminderEnabled ? 1 : 0,
          draft.reminderType,
          draft.remindAt,
          now,
          now,
        ]
      )
    }

    this.db.run('DELETE FROM todo_tags WHERE todo_id = ?', [id])
    for (const tagId of draft.tagIds) {
      this.db.run(
        'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)',
        [id, tagId]
      )
    }

    this.save()

    const result = this.db.exec(
      'SELECT * FROM todos WHERE id = ?',
      [id]
    )
    return this.rowToTodo(result[0].values[0])
  }

  toggleTodo(todoId: string, completed: boolean): Todo {
    const now = new Date().toISOString()

    if (completed) {
      this.db.run(
        'UPDATE todos SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
        ['completed', now, now, todoId]
      )
    } else {
      this.db.run(
        "UPDATE todos SET status = 'pending', completed_at = NULL, updated_at = ? WHERE id = ?",
        [now, todoId]
      )
    }

    this.save()

    const result = this.db.exec('SELECT * FROM todos WHERE id = ?', [todoId])
    return this.rowToTodo(result[0].values[0])
  }

  deleteTodo(todoId: string) {
    this.db.run('UPDATE todos SET status = ? WHERE id = ?', ['archived', todoId])
    this.save()
  }

  restoreTodo(todoId: string): Todo {
    this.db.run(
      "UPDATE todos SET status = 'pending', completed_at = NULL WHERE id = ?",
      [todoId]
    )
    this.save()

    const result = this.db.exec('SELECT * FROM todos WHERE id = ?', [todoId])
    return this.rowToTodo(result[0].values[0])
  }

  createCategory(name: string): Category {
    const id = this.generateId()
    const now = new Date().toISOString()
    const maxOrder = this.db.exec('SELECT MAX(sort_order) FROM categories')
    const sortOrder = ((maxOrder[0]?.values[0]?.[0] as number) ?? 0) + 1

    this.db.run(
      'INSERT INTO categories (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
      [id, name, sortOrder, now]
    )
    this.save()

    return { id, name, sortOrder, createdAt: now }
  }

  createTag(name: string): Tag {
    const existing = this.db.exec('SELECT id, name, created_at FROM tags WHERE name = ?', [name])
    if (existing[0]?.values?.length) {
      return {
        id: existing[0].values[0][0] as string,
        name: existing[0].values[0][1] as string,
        createdAt: existing[0].values[0][2] as string,
      }
    }

    const id = this.generateId()
    const now = new Date().toISOString()
    this.db.run(
      'INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)',
      [id, name, now]
    )
    this.save()

    return { id, name, createdAt: now }
  }

  updateSettings(patch: Partial<Settings>): BootstrapData {
    for (const [key, value] of Object.entries(patch)) {
      this.db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        key,
        JSON.stringify(value),
      ])
    }
    this.save()
    return this.getBootstrapData()
  }

  getDueReminderEvents(): ReminderEvent[] {
    const now = new Date()
    const nowStr = now.toISOString()
    const today = nowStr.slice(0, 10)

    const result = this.db.exec(
      `SELECT t.id, t.title, t.notes, t.due_date, t.due_time, t.reminder_type, t.remind_at
       FROM todos t
       WHERE t.status = 'pending'
         AND t.reminder_enabled = 1
         AND t.reminder_type != 'none'
         AND t.remind_at IS NOT NULL
         AND t.remind_at <= ?
       ORDER BY t.remind_at ASC`,
      [nowStr]
    )

    const events: ReminderEvent[] = []
    for (const row of result[0]?.values ?? []) {
      const remindAt = row[6] as string
      const channel = row[5] as ReminderType

      const alreadyLogged = this.db.exec(
        `SELECT id FROM reminder_logs
         WHERE todo_id = ? AND channel = ? AND triggered_at >= ?`,
        [row[0] as string, channel, remindAt.slice(0, 16)]
      )

      if (!alreadyLogged[0]?.values?.length) {
        const dueDate = row[3] as string | null
        const dueTime = row[4] as string | null
        let dueLabel = ''
        if (dueDate) {
          dueLabel = dueDate
          if (dueTime) dueLabel += ` ${dueTime}`
        }

        events.push({
          todoId: row[0] as string,
          title: row[1] as string,
          notes: row[2] as string,
          dueLabel,
          reminderType: channel,
        })
      }
    }

    return events
  }

  recordReminder(todoId: string, channel: ReminderType) {
    const id = this.generateId()
    const now = new Date().toISOString()
    this.db.run(
      'INSERT INTO reminder_logs (id, todo_id, triggered_at, channel, status) VALUES (?, ?, ?, ?, ?)',
      [id, todoId, now, channel, 'success']
    )
    this.save()
  }

  advanceRecurringTodo(todo: Todo): void {
    const now = new Date()
    let nextDate: Date

    if (todo.dueDate) {
      const due = new Date(todo.dueDate)
      switch (todo.repeatRule) {
        case 'daily':
          nextDate = new Date(due.setDate(due.getDate() + 1))
          break
        case 'weekly':
          nextDate = new Date(due.setDate(due.getDate() + 7))
          break
        case 'monthly':
          nextDate = new Date(due.setMonth(due.getMonth() + 1))
          break
        default:
          return
      }

      this.db.run(
        'UPDATE todos SET due_date = ?, updated_at = ? WHERE id = ?',
        [nextDate.toISOString().slice(0, 10), new Date().toISOString(), todo.id]
      )
      this.save()
    }
  }

  exportSnapshot(): string {
    return JSON.stringify(this.getBootstrapData(), null, 2)
  }

  importSnapshot(data: BootstrapData): BootstrapData {
    this.db.run('DELETE FROM todo_tags')
    this.db.run('DELETE FROM todos')
    this.db.run('DELETE FROM categories')
    this.db.run('DELETE FROM tags')

    for (const cat of data.categories) {
      this.db.run(
        'INSERT INTO categories (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
        [cat.id, cat.name, cat.sortOrder, cat.createdAt]
      )
    }

    for (const tag of data.tags) {
      this.db.run(
        'INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)',
        [tag.id, tag.name, tag.createdAt]
      )
    }

    for (const todo of data.todos) {
      this.db.run(
        `INSERT INTO todos (id, title, notes, status, priority, category_id, due_date, due_time, is_pinned, repeat_rule, reminder_enabled, reminder_type, remind_at, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          todo.id, todo.title, todo.notes, todo.status, todo.priority,
          todo.categoryId, todo.dueDate, todo.dueTime, todo.isPinned ? 1 : 0,
          todo.repeatRule, todo.reminderEnabled ? 1 : 0, todo.reminderType,
          todo.remindAt, todo.completedAt, todo.createdAt, todo.updatedAt,
        ]
      )

      for (const tagId of todo.tagIds) {
        this.db.run(
          'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)',
          [todo.id, tagId]
        )
      }
    }

    for (const [key, value] of Object.entries(data.settings)) {
      this.db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        key,
        JSON.stringify(value),
      ])
    }

    this.save()
    return this.getBootstrapData()
  }

  // ========== Recurring Todos (每日待办模板) ==========

  private rowToRecurringTodo(row: unknown[]): RecurringTodo {
    const tagRows = this.db.exec(
      'SELECT tag_id FROM recurring_todo_tags WHERE recurring_todo_id = ?',
      [row[0]]
    )
    const tagIds = (tagRows[0]?.values ?? []).map((r) => r[0] as string)

    return {
      id: row[0] as string,
      title: row[1] as string,
      notes: row[2] as string,
      priority: row[3] as RecurringTodo['priority'],
      categoryId: row[4] as string | null,
      pattern: row[5] as RecurringTodo['pattern'],
      customDays: JSON.parse((row[6] as string) ?? '[]'),
      reminderEnabled: (row[7] as number) === 1,
      reminderType: row[8] as ReminderType,
      reminderTime: row[9] as string | null,
      isActive: (row[10] as number) === 1,
      lastGeneratedAt: row[11] as string | null,
      createdAt: row[12] as string,
      updatedAt: row[13] as string,
      tagIds,
    }
  }

  getRecurringTodos(): RecurringTodo[] {
    const result = this.db.exec(
      'SELECT * FROM recurring_todos ORDER BY created_at DESC'
    )
    return (result[0]?.values ?? []).map((row) => this.rowToRecurringTodo(row))
  }

  getActiveRecurringTodos(): RecurringTodo[] {
    const result = this.db.exec(
      'SELECT * FROM recurring_todos WHERE is_active = 1 ORDER BY created_at DESC'
    )
    return (result[0]?.values ?? []).map((row) => this.rowToRecurringTodo(row))
  }

  createRecurringTodo(draft: RecurringTodoDraft): RecurringTodo {
    const id = this.generateId()
    const now = new Date().toISOString()

    this.db.run(
      `INSERT INTO recurring_todos (id, title, notes, priority, category_id, pattern, custom_days, reminder_enabled, reminder_type, reminder_time, is_active, last_generated_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        draft.title,
        draft.notes,
        draft.priority,
        draft.categoryId,
        draft.pattern,
        JSON.stringify(draft.customDays),
        draft.reminderEnabled ? 1 : 0,
        draft.reminderType,
        draft.reminderTime,
        draft.isActive ? 1 : 0,
        null,
        now,
        now,
      ]
    )

    for (const tagId of draft.tagIds) {
      this.db.run(
        'INSERT OR IGNORE INTO recurring_todo_tags (recurring_todo_id, tag_id) VALUES (?, ?)',
        [id, tagId]
      )
    }

    this.save()
    return this.getRecurringTodoById(id)!
  }

  updateRecurringTodo(id: string, draft: Partial<RecurringTodoDraft>): RecurringTodo {
    const now = new Date().toISOString()
    const sets: string[] = []
    const values: unknown[] = []

    if (draft.title !== undefined) {
      sets.push('title = ?')
      values.push(draft.title)
    }
    if (draft.notes !== undefined) {
      sets.push('notes = ?')
      values.push(draft.notes)
    }
    if (draft.priority !== undefined) {
      sets.push('priority = ?')
      values.push(draft.priority)
    }
    if (draft.categoryId !== undefined) {
      sets.push('category_id = ?')
      values.push(draft.categoryId)
    }
    if (draft.pattern !== undefined) {
      sets.push('pattern = ?')
      values.push(draft.pattern)
    }
    if (draft.customDays !== undefined) {
      sets.push('custom_days = ?')
      values.push(JSON.stringify(draft.customDays))
    }
    if (draft.reminderEnabled !== undefined) {
      sets.push('reminder_enabled = ?')
      values.push(draft.reminderEnabled ? 1 : 0)
    }
    if (draft.reminderType !== undefined) {
      sets.push('reminder_type = ?')
      values.push(draft.reminderType)
    }
    if (draft.reminderTime !== undefined) {
      sets.push('reminder_time = ?')
      values.push(draft.reminderTime)
    }
    if (draft.isActive !== undefined) {
      sets.push('is_active = ?')
      values.push(draft.isActive ? 1 : 0)
    }
    sets.push('updated_at = ?')
    values.push(now)
    values.push(id)

    this.db.run(
      `UPDATE recurring_todos SET ${sets.join(', ')} WHERE id = ?`,
      values
    )

    if (draft.tagIds !== undefined) {
      this.db.run('DELETE FROM recurring_todo_tags WHERE recurring_todo_id = ?', [id])
      for (const tagId of draft.tagIds) {
        this.db.run(
          'INSERT OR IGNORE INTO recurring_todo_tags (recurring_todo_id, tag_id) VALUES (?, ?)',
          [id, tagId]
        )
      }
    }

    this.save()
    return this.getRecurringTodoById(id)!
  }

  deleteRecurringTodo(id: string): void {
    this.db.run('DELETE FROM recurring_todo_tags WHERE recurring_todo_id = ?', [id])
    this.db.run('DELETE FROM recurring_todos WHERE id = ?', [id])
    this.save()
  }

  getRecurringTodoById(id: string): RecurringTodo | null {
    const result = this.db.exec('SELECT * FROM recurring_todos WHERE id = ?', [id])
    if (!result[0]?.values?.length) return null
    return this.rowToRecurringTodo(result[0].values[0])
  }

  // 检查并生成今日待办
  generateDailyTodos(): number {
    const today = new Date().toISOString().slice(0, 10)
    const todayWeekday = new Date().getDay() // 0=周日, 1=周一, ... 6=周六
    const recurringTodos = this.getActiveRecurringTodos()
    let generatedCount = 0

    for (const rt of recurringTodos) {
      // 检查今天是否需要生成
      let shouldGenerate = false

      switch (rt.pattern) {
        case 'daily':
          shouldGenerate = true
          break
        case 'weekdays':
          shouldGenerate = todayWeekday >= 1 && todayWeekday <= 5
          break
        case 'weekends':
          shouldGenerate = todayWeekday === 0 || todayWeekday === 6
          break
        case 'custom':
          shouldGenerate = rt.customDays.includes(todayWeekday)
          break
      }

      if (!shouldGenerate) continue

      // 检查今天是否已经生成过
      if (rt.lastGeneratedAt === today) continue

      // 生成今日待办
      const todoDraft: TodoDraft = {
        title: rt.title,
        notes: rt.notes,
        priority: rt.priority,
        categoryId: rt.categoryId,
        dueDate: today,
        dueTime: rt.reminderTime,
        isPinned: false,
        repeatRule: 'none',
        reminderEnabled: rt.reminderEnabled,
        reminderType: rt.reminderType,
        remindAt: rt.reminderEnabled && rt.reminderTime
          ? `${today}T${rt.reminderTime}:00`
          : null,
        tagIds: rt.tagIds,
      }

      this.saveTodo(todoDraft)

      // 更新 lastGeneratedAt
      this.db.run(
        'UPDATE recurring_todos SET last_generated_at = ? WHERE id = ?',
        [today, rt.id]
      )

      generatedCount++
    }

    if (generatedCount > 0) {
      this.save()
    }

    return generatedCount
  }

  // ========== Pomodoro Sessions ==========

  private rowToPomodoroSession(row: unknown[]): PomodoroSession {
    return {
      id: row[0] as string,
      todoId: row[1] as string | null,
      startTime: row[2] as string,
      endTime: row[3] as string | null,
      duration: row[4] as number,
      plannedDuration: row[5] as number,
      completed: (row[6] as number) === 1,
      interruptCount: row[7] as number,
      interruptReason: row[8] as string | null,
      workType: row[9] as 'deep' | 'shallow',
    }
  }

  createPomodoroSession(session: Omit<PomodoroSession, 'id'>): PomodoroSession {
    const id = this.generateId()
    this.db.run(
      `INSERT INTO pomodoro_sessions (id, todo_id, start_time, end_time, duration, planned_duration, completed, interrupt_count, interrupt_reason, work_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, session.todoId, session.startTime, session.endTime, session.duration, session.plannedDuration, session.completed ? 1 : 0, session.interruptCount, session.interruptReason, session.workType]
    )
    this.save()
    // Update daily stats
    this.updateDailyStats()
    return this.rowToPomodoroSession([id, session.todoId, session.startTime, session.endTime, session.duration, session.plannedDuration, session.completed ? 1 : 0, session.interruptCount, session.interruptReason, session.workType])
  }

  updatePomodoroSession(id: string, patch: Partial<PomodoroSession>): PomodoroSession | null {
    const sets: string[] = []
    const values: unknown[] = []

    if (patch.endTime !== undefined) { sets.push('end_time = ?'); values.push(patch.endTime) }
    if (patch.duration !== undefined) { sets.push('duration = ?'); values.push(patch.duration) }
    if (patch.completed !== undefined) { sets.push('completed = ?'); values.push(patch.completed ? 1 : 0) }
    if (patch.interruptCount !== undefined) { sets.push('interrupt_count = ?'); values.push(patch.interruptCount) }
    if (patch.interruptReason !== undefined) { sets.push('interrupt_reason = ?'); values.push(patch.interruptReason) }
    if (patch.workType !== undefined) { sets.push('work_type = ?'); values.push(patch.workType) }

    if (sets.length === 0) return this.getPomodoroSessionById(id)

    values.push(id)
    this.db.run(`UPDATE pomodoro_sessions SET ${sets.join(', ')} WHERE id = ?`, values)
    this.save()
    this.updateDailyStats()
    return this.getPomodoroSessionById(id)
  }

  getPomodoroSessionById(id: string): PomodoroSession | null {
    const result = this.db.exec('SELECT * FROM pomodoro_sessions WHERE id = ?', [id])
    if (!result[0]?.values?.length) return null
    return this.rowToPomodoroSession(result[0].values[0])
  }

  getPomodoroSessions(dateRange?: { start: string; end: string }): PomodoroSession[] {
    if (dateRange) {
      const result = this.db.exec(
        'SELECT * FROM pomodoro_sessions WHERE start_time >= ? AND start_time <= ? ORDER BY start_time DESC',
        [dateRange.start, dateRange.end]
      )
      return (result[0]?.values ?? []).map((row) => this.rowToPomodoroSession(row))
    }
    const result = this.db.exec('SELECT * FROM pomodoro_sessions ORDER BY start_time DESC')
    return (result[0]?.values ?? []).map((row) => this.rowToPomodoroSession(row))
  }

  getTodayPomodoroSessions(): PomodoroSession[] {
    const today = new Date().toISOString().slice(0, 10)
    const result = this.db.exec(
      "SELECT * FROM pomodoro_sessions WHERE start_time >= ? ORDER BY start_time DESC",
      [today]
    )
    return (result[0]?.values ?? []).map((row) => this.rowToPomodoroSession(row))
  }

  // ========== Health Reminders ==========

  private rowToHealthReminder(row: unknown[]): HealthReminder {
    return {
      id: row[0] as string,
      name: row[1] as string,
      icon: row[2] as string,
      message: row[3] as string,
      enabled: (row[4] as number) === 1,
      triggerType: row[5] as 'interval' | 'fixed',
      intervalMinutes: row[6] as number | null,
      fixedTime: row[7] as string | null,
      fixedDays: JSON.parse((row[8] as string) ?? '[]'),
      notifyType: row[9] as 'notification' | 'popup' | 'both',
      skipDuringPomodoro: (row[10] as number) === 1,
      workdaysOnly: (row[11] as number) === 1,
      weekendsOnly: (row[12] as number) === 1,
      holidayAutoOff: (row[13] as number) === 1,
      sortOrder: row[14] as number,
    }
  }

  getHealthReminders(): HealthReminder[] {
    const result = this.db.exec('SELECT * FROM health_reminders ORDER BY sort_order')
    return (result[0]?.values ?? []).map((row) => this.rowToHealthReminder(row))
  }

  createHealthReminder(reminder: Omit<HealthReminder, 'id'>): HealthReminder {
    const id = this.generateId()
    this.db.run(
      `INSERT INTO health_reminders (id, name, icon, message, enabled, trigger_type, interval_minutes, fixed_time, fixed_days, notify_type, skip_during_pomodoro, workdays_only, weekends_only, holiday_auto_off, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, reminder.name, reminder.icon, reminder.message, reminder.enabled ? 1 : 0, reminder.triggerType, reminder.intervalMinutes, reminder.fixedTime, JSON.stringify(reminder.fixedDays), reminder.notifyType, reminder.skipDuringPomodoro ? 1 : 0, reminder.workdaysOnly ? 1 : 0, reminder.weekendsOnly ? 1 : 0, reminder.holidayAutoOff ? 1 : 0, reminder.sortOrder]
    )
    this.save()
    return this.rowToHealthReminder([id, reminder.name, reminder.icon, reminder.message, reminder.enabled ? 1 : 0, reminder.triggerType, reminder.intervalMinutes, reminder.fixedTime, JSON.stringify(reminder.fixedDays), reminder.notifyType, reminder.skipDuringPomodoro ? 1 : 0, reminder.workdaysOnly ? 1 : 0, reminder.weekendsOnly ? 1 : 0, reminder.holidayAutoOff ? 1 : 0, reminder.sortOrder])
  }

  updateHealthReminder(id: string, patch: Partial<HealthReminder>): HealthReminder | null {
    const sets: string[] = []
    const values: unknown[] = []

    if (patch.name !== undefined) { sets.push('name = ?'); values.push(patch.name) }
    if (patch.icon !== undefined) { sets.push('icon = ?'); values.push(patch.icon) }
    if (patch.message !== undefined) { sets.push('message = ?'); values.push(patch.message) }
    if (patch.enabled !== undefined) { sets.push('enabled = ?'); values.push(patch.enabled ? 1 : 0) }
    if (patch.triggerType !== undefined) { sets.push('trigger_type = ?'); values.push(patch.triggerType) }
    if (patch.intervalMinutes !== undefined) { sets.push('interval_minutes = ?'); values.push(patch.intervalMinutes) }
    if (patch.fixedTime !== undefined) { sets.push('fixed_time = ?'); values.push(patch.fixedTime) }
    if (patch.fixedDays !== undefined) { sets.push('fixed_days = ?'); values.push(JSON.stringify(patch.fixedDays)) }
    if (patch.notifyType !== undefined) { sets.push('notify_type = ?'); values.push(patch.notifyType) }
    if (patch.skipDuringPomodoro !== undefined) { sets.push('skip_during_pomodoro = ?'); values.push(patch.skipDuringPomodoro ? 1 : 0) }
    if (patch.workdaysOnly !== undefined) { sets.push('workdays_only = ?'); values.push(patch.workdaysOnly ? 1 : 0) }
    if (patch.weekendsOnly !== undefined) { sets.push('weekends_only = ?'); values.push(patch.weekendsOnly ? 1 : 0) }
    if (patch.holidayAutoOff !== undefined) { sets.push('holiday_auto_off = ?'); values.push(patch.holidayAutoOff ? 1 : 0) }
    if (patch.sortOrder !== undefined) { sets.push('sort_order = ?'); values.push(patch.sortOrder) }

    if (sets.length === 0) return null

    values.push(id)
    this.db.run(`UPDATE health_reminders SET ${sets.join(', ')} WHERE id = ?`, values)
    this.save()

    const result = this.db.exec('SELECT * FROM health_reminders WHERE id = ?', [id])
    if (!result[0]?.values?.length) return null
    return this.rowToHealthReminder(result[0].values[0])
  }

  deleteHealthReminder(id: string): void {
    this.db.run('DELETE FROM reminder_history WHERE reminder_id = ?', [id])
    this.db.run('DELETE FROM health_reminders WHERE id = ?', [id])
    this.save()
  }

  // Health reminder trigger check
  getDueHealthReminders(isPomodoroActive: boolean): HealthReminder[] {
    const now = new Date()
    const todayWeekday = now.getDay()
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const today = now.toISOString().slice(0, 10)

    const result = this.db.exec('SELECT * FROM health_reminders WHERE enabled = 1 ORDER BY sort_order')
    const reminders = (result[0]?.values ?? []).map((row) => this.rowToHealthReminder(row))

    return reminders.filter((r) => {
      // Skip during pomodoro
      if (r.skipDuringPomodoro && isPomodoroActive) return false

      // Workday/weekend check
      const isWeekend = todayWeekday === 0 || todayWeekday === 6
      if (r.workdaysOnly && isWeekend) return false
      if (r.weekendsOnly && !isWeekend) return false

      // Check if already triggered recently
      const recentHistory = this.db.exec(
        'SELECT triggered_at FROM reminder_history WHERE reminder_id = ? AND triggered_at >= ?',
        [r.id, today]
      )
      const triggeredTimes = recentHistory[0]?.values ?? []

      if (r.triggerType === 'fixed') {
        if (!r.fixedTime) return false
        // Fixed time reminder
        if (r.fixedDays.length > 0 && !r.fixedDays.includes(todayWeekday)) return false
        if (r.fixedTime <= nowTime) {
          // Check if already triggered today for this fixed time
          const alreadyTriggered = triggeredTimes.some((t) => {
            const triggeredAt = t[0] as string
            return triggeredAt.includes(today) && triggeredAt.includes(r.fixedTime!.replace(':', ''))
          })
          return !alreadyTriggered
        }
        return false
      }

      if (r.triggerType === 'interval' && r.intervalMinutes) {
        // Interval reminder - check last trigger
        if (triggeredTimes.length === 0) return true
        const lastTriggered = triggeredTimes[triggeredTimes.length - 1][0] as string
        const lastTime = new Date(lastTriggered)
        const elapsed = (now.getTime() - lastTime.getTime()) / 60000
        return elapsed >= r.intervalMinutes
      }

      return false
    })
  }

  recordHealthReminderTrigger(reminderId: string, responded: boolean, snoozed: boolean, snoozedMinutes?: number): void {
    const id = this.generateId()
    const now = new Date().toISOString()
    this.db.run(
      'INSERT INTO reminder_history (id, reminder_id, triggered_at, responded, snoozed, snoozed_minutes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, reminderId, now, responded ? 1 : 0, snoozed ? 1 : 0, snoozedMinutes ?? null]
    )
    this.save()
  }

  getReminderHistory(reminderId?: string): ReminderHistoryEntry[] {
    const result = reminderId
      ? this.db.exec('SELECT * FROM reminder_history WHERE reminder_id = ? ORDER BY triggered_at DESC LIMIT 50', [reminderId])
      : this.db.exec('SELECT * FROM reminder_history ORDER BY triggered_at DESC LIMIT 100')
    return (result[0]?.values ?? []).map((row) => ({
      id: row[0] as string,
      reminderId: row[1] as string,
      triggeredAt: row[2] as string,
      responded: (row[3] as number) === 1,
      snoozed: (row[4] as number) === 1,
      snoozedMinutes: row[5] as number | null,
    }))
  }

  // ========== Time Blocks ==========

  private rowToTimeBlock(row: unknown[]): TimeBlock {
    return {
      id: row[0] as string,
      todoId: row[1] as string | null,
      title: row[2] as string,
      startTime: row[3] as string,
      endTime: row[4] as string,
      color: row[5] as string | null,
      categoryId: row[6] as string | null,
      isAllDay: (row[7] as number) === 1,
      notes: row[8] as string | null,
      actualPomodoros: row[9] as number,
    }
  }

  getTimeBlocks(date?: string): TimeBlock[] {
    if (date) {
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      const result = this.db.exec(
        'SELECT * FROM time_blocks WHERE start_time >= ? AND start_time < ? ORDER BY start_time',
        [date, nextDay.toISOString().slice(0, 10)]
      )
      return (result[0]?.values ?? []).map((row) => this.rowToTimeBlock(row))
    }
    const result = this.db.exec('SELECT * FROM time_blocks ORDER BY start_time')
    return (result[0]?.values ?? []).map((row) => this.rowToTimeBlock(row))
  }

  createTimeBlock(block: Omit<TimeBlock, 'id'>): TimeBlock {
    const id = this.generateId()
    this.db.run(
      'INSERT INTO time_blocks (id, todo_id, title, start_time, end_time, color, category_id, is_all_day, notes, actual_pomodoros) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, block.todoId, block.title, block.startTime, block.endTime, block.color, block.categoryId, block.isAllDay ? 1 : 0, block.notes, block.actualPomodoros]
    )
    this.save()
    return this.rowToTimeBlock([id, block.todoId, block.title, block.startTime, block.endTime, block.color, block.categoryId, block.isAllDay ? 1 : 0, block.notes, block.actualPomodoros])
  }

  updateTimeBlock(id: string, patch: Partial<TimeBlock>): TimeBlock | null {
    const sets: string[] = []
    const values: unknown[] = []

    if (patch.todoId !== undefined) { sets.push('todo_id = ?'); values.push(patch.todoId) }
    if (patch.title !== undefined) { sets.push('title = ?'); values.push(patch.title) }
    if (patch.startTime !== undefined) { sets.push('start_time = ?'); values.push(patch.startTime) }
    if (patch.endTime !== undefined) { sets.push('end_time = ?'); values.push(patch.endTime) }
    if (patch.color !== undefined) { sets.push('color = ?'); values.push(patch.color) }
    if (patch.categoryId !== undefined) { sets.push('category_id = ?'); values.push(patch.categoryId) }
    if (patch.isAllDay !== undefined) { sets.push('is_all_day = ?'); values.push(patch.isAllDay ? 1 : 0) }
    if (patch.notes !== undefined) { sets.push('notes = ?'); values.push(patch.notes) }
    if (patch.actualPomodoros !== undefined) { sets.push('actual_pomodoros = ?'); values.push(patch.actualPomodoros) }

    if (sets.length === 0) return null

    values.push(id)
    this.db.run(`UPDATE time_blocks SET ${sets.join(', ')} WHERE id = ?`, values)
    this.save()

    const result = this.db.exec('SELECT * FROM time_blocks WHERE id = ?', [id])
    if (!result[0]?.values?.length) return null
    return this.rowToTimeBlock(result[0].values[0])
  }

  deleteTimeBlock(id: string): void {
    this.db.run('DELETE FROM time_blocks WHERE id = ?', [id])
    this.save()
  }

  // ========== Themes ==========

  getThemes(): { id: string; name: string; config: string; isBuiltIn: boolean }[] {
    const result = this.db.exec('SELECT id, name, config, is_built_in FROM themes ORDER BY is_built_in DESC, created_at')
    return (result[0]?.values ?? []).map((row) => ({
      id: row[0] as string,
      name: row[1] as string,
      config: row[2] as string,
      isBuiltIn: (row[3] as number) === 1,
    }))
  }

  createCustomTheme(id: string, name: string, config: string): void {
    const now = new Date().toISOString()
    this.db.run(
      'INSERT INTO themes (id, name, config, is_built_in, created_at) VALUES (?, ?, ?, 0, ?)',
      [id, name, config, now]
    )
    this.save()
  }

  updateTheme(id: string, name: string, config: string): void {
    this.db.run('UPDATE themes SET name = ?, config = ? WHERE id = ?', [name, config, id])
    this.save()
  }

  deleteTheme(id: string): void {
    this.db.run('DELETE FROM themes WHERE id = ? AND is_built_in = 0', [id])
    this.save()
  }

  // ========== AI Settings ==========

  getAISettings(): AISettings {
    const result = this.db.exec('SELECT provider, api_url, api_key, model, temperature, max_tokens, proxy FROM ai_settings WHERE id = 1')
    if (!result[0]?.values?.length) return { ...DEFAULT_AI_SETTINGS }
    const row = result[0].values[0]
    return {
      provider: row[0] as AISettings['provider'],
      apiUrl: row[1] as string,
      apiKey: row[2] as string,
      model: row[3] as string,
      temperature: row[4] as number,
      maxTokens: row[5] as number,
      proxy: row[6] as string | null,
    }
  }

  updateAISettings(patch: Partial<AISettings>): AISettings {
    const sets: string[] = []
    const values: unknown[] = []

    if (patch.provider !== undefined) { sets.push('provider = ?'); values.push(patch.provider) }
    if (patch.apiUrl !== undefined) { sets.push('api_url = ?'); values.push(patch.apiUrl) }
    if (patch.apiKey !== undefined) { sets.push('api_key = ?'); values.push(patch.apiKey) }
    if (patch.model !== undefined) { sets.push('model = ?'); values.push(patch.model) }
    if (patch.temperature !== undefined) { sets.push('temperature = ?'); values.push(patch.temperature) }
    if (patch.maxTokens !== undefined) { sets.push('max_tokens = ?'); values.push(patch.maxTokens) }
    if (patch.proxy !== undefined) { sets.push('proxy = ?'); values.push(patch.proxy) }

    if (sets.length > 0) {
      sets.push('updated_at = ?')
      values.push(new Date().toISOString())
      this.db.run(`UPDATE ai_settings SET ${sets.join(', ')} WHERE id = 1`, values)
      this.save()
    }

    return this.getAISettings()
  }

  // ========== Daily Stats ==========

  updateDailyStats(): void {
    const today = new Date().toISOString().slice(0, 10)
    const todayStart = today
    const todayEnd = `${today}T23:59:59`

    // Calculate today's stats
    const completedResult = this.db.exec(
      "SELECT COUNT(*) FROM todos WHERE status = 'completed' AND completed_at >= ? AND completed_at <= ?",
      [todayStart, todayEnd]
    )
    const completedCount = (completedResult[0]?.values?.[0]?.[0] as number) ?? 0

    const focusResult = this.db.exec(
      'SELECT COALESCE(SUM(duration), 0) FROM pomodoro_sessions WHERE completed = 1 AND start_time >= ? AND start_time <= ?',
      [todayStart, todayEnd]
    )
    const totalFocusMinutes = (focusResult[0]?.values?.[0]?.[0] as number) ?? 0

    const pomodoroResult = this.db.exec(
      'SELECT COUNT(*) FROM pomodoro_sessions WHERE completed = 1 AND start_time >= ? AND start_time <= ?',
      [todayStart, todayEnd]
    )
    const pomodoroCount = (pomodoroResult[0]?.values?.[0]?.[0] as number) ?? 0

    const deepResult = this.db.exec(
      "SELECT COALESCE(SUM(duration), 0) FROM pomodoro_sessions WHERE completed = 1 AND work_type = 'deep' AND start_time >= ? AND start_time <= ?",
      [todayStart, todayEnd]
    )
    const deepWorkMinutes = (deepResult[0]?.values?.[0]?.[0] as number) ?? 0

    const interruptResult = this.db.exec(
      'SELECT COALESCE(SUM(interrupt_count), 0) FROM pomodoro_sessions WHERE start_time >= ? AND start_time <= ?',
      [todayStart, todayEnd]
    )
    const interruptCount = (interruptResult[0]?.values?.[0]?.[0] as number) ?? 0

    // Upsert daily stats
    const existing = this.db.exec('SELECT id FROM daily_stats WHERE date = ?', [today])
    if (existing[0]?.values?.length) {
      this.db.run(
        'UPDATE daily_stats SET completed_count = ?, total_focus_minutes = ?, deep_work_minutes = ?, pomodoro_count = ?, interrupt_count = ? WHERE date = ?',
        [completedCount, totalFocusMinutes, deepWorkMinutes, pomodoroCount, interruptCount, today]
      )
    } else {
      const id = this.generateId()
      this.db.run(
        'INSERT INTO daily_stats (id, date, completed_count, total_focus_minutes, deep_work_minutes, pomodoro_count, interrupt_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, today, completedCount, totalFocusMinutes, deepWorkMinutes, pomodoroCount, interruptCount, new Date().toISOString()]
      )
    }
    this.save()
  }

  getDailyStats(dateRange?: { start: string; end: string }): DailyStats[] {
    let sql = 'SELECT * FROM daily_stats'
    const params: string[] = []
    if (dateRange) {
      sql += ' WHERE date >= ? AND date <= ?'
      params.push(dateRange.start, dateRange.end)
    }
    sql += ' ORDER BY date DESC'

    const result = params.length ? this.db.exec(sql, params) : this.db.exec(sql)
    return (result[0]?.values ?? []).map((row) => ({
      id: row[0] as string,
      date: row[1] as string,
      completedCount: row[2] as number,
      totalFocusMinutes: row[3] as number,
      deepWorkMinutes: row[4] as number,
      pomodoroCount: row[5] as number,
      interruptCount: row[6] as number,
    }))
  }

  // ========== Pomodoro Settings (stored in settings table) ==========

  getPomodoroSettings(): PomodoroSettings {
    const result = this.db.exec("SELECT value FROM settings WHERE key = 'pomodoroSettings'")
    if (!result[0]?.values?.length) return { ...DEFAULT_POMODORO_SETTINGS }
    try {
      return JSON.parse(result[0].values[0][0] as string)
    } catch {
      return { ...DEFAULT_POMODORO_SETTINGS }
    }
  }

  updatePomodoroSettings(patch: Partial<PomodoroSettings>): PomodoroSettings {
    const current = this.getPomodoroSettings()
    const updated = { ...current, ...patch }
    this.db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'pomodoroSettings',
      JSON.stringify(updated),
    ])
    this.save()
    return updated
  }

  getCurrentThemeId(): string {
    const result = this.db.exec("SELECT value FROM settings WHERE key = 'currentThemeId'")
    if (!result[0]?.values?.length) return 'theme-warmwhite'
    try {
      return JSON.parse(result[0].values[0][0] as string)
    } catch {
      return 'theme-warmwhite'
    }
  }

  setCurrentThemeId(themeId: string): void {
    this.db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'currentThemeId',
      JSON.stringify(themeId),
    ])
    this.save()
  }
}
