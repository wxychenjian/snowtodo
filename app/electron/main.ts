import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, Notification, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import type { BootstrapData, HealthReminder, PomodoroSession, PomodoroSettings, RecurringTodoDraft, ReminderEvent, Settings, TimeBlock, TodoDraft, AISettings } from '../src/types'
import { AppDatabase } from './db'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)
const database = new AppDatabase()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let reminderTimer: NodeJS.Timeout | null = null
let healthReminderTimer: NodeJS.Timeout | null = null
let isPomodoroActive = false

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    backgroundColor: '#faf9f7',
    title: 'SnowTodo',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
  })

  // 点击关闭按钮 → 隐藏到托盘而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow!.hide()
    }
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, '../public/tray-icon.png')
    : path.join(__dirname, '../dist/tray-icon.png')

  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('SnowTodo')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // 双击托盘图标显示主窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function applyLaunchOnStartup(settings: Settings) {
  app.setLoginItemSettings({ openAtLogin: settings.launchOnStartup })
}

function dispatchReminder(event: ReminderEvent) {
  database.recordReminder(event.todoId, event.reminderType)

  if (event.reminderType === 'system' || event.reminderType === 'both') {
    new Notification({
      title: `待办提醒：${event.title}`,
      body: event.notes || `提醒时间：${event.dueLabel}`,
    }).show()
  }

  if (event.reminderType === 'popup' || event.reminderType === 'both') {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('reminder:triggered', event)
    }
  }
}

function startReminderLoop() {
  if (reminderTimer) {
    clearInterval(reminderTimer)
  }

  const check = () => {
    try {
      // 先生成每日待办
      database.generateDailyTodos()
      // 再检查提醒
      const events = database.getDueReminderEvents()
      events.forEach(dispatchReminder)
    } catch (err) {
      console.error('[Main] Reminder loop error:', err)
    }
  }

  check()
  reminderTimer = setInterval(check, 30_000)
}

function dispatchHealthReminder(reminder: HealthReminder) {
  if (reminder.notifyType === 'notification' || reminder.notifyType === 'both') {
    new Notification({
      title: `${reminder.icon} ${reminder.name}`,
      body: reminder.message,
    }).show()
  }

  if (reminder.notifyType === 'popup' || reminder.notifyType === 'both') {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('health-reminder:triggered', reminder)
    }
  }

  database.recordHealthReminderTrigger(reminder.id, true, false)
}

function startHealthReminderLoop() {
  if (healthReminderTimer) {
    clearInterval(healthReminderTimer)
  }

  const check = () => {
    try {
      const dueReminders = database.getDueHealthReminders(isPomodoroActive)
      dueReminders.forEach(dispatchHealthReminder)
    } catch (err) {
      console.error('[Main] Health reminder loop error:', err)
    }
  }

  check()
  healthReminderTimer = setInterval(check, 60_000)
}

function registerGlobalShortcut() {
  const pomodoroSettings = database.getPomodoroSettings()
  try {
    globalShortcut.unregisterAll()
    if (pomodoroSettings.globalShortcut) {
      globalShortcut.register(pomodoroSettings.globalShortcut, () => {
        if (mainWindow) {
          mainWindow.webContents.send('pomodoro:toggle')
        }
      })
    }
  } catch (err) {
    console.error('[Main] Global shortcut registration error:', err)
  }
}

async function exportData() {
  const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
    title: '导出待办数据',
    defaultPath: path.join(app.getPath('documents'), 'snowtodo-backup.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (result.canceled || !result.filePath) {
    return
  }

  fs.writeFileSync(result.filePath, database.exportSnapshot(), 'utf-8')
}

async function importData() {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    title: '导入待办数据',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const raw = fs.readFileSync(result.filePaths[0], 'utf-8')
  const snapshot = JSON.parse(raw) as BootstrapData
  const bootstrap = database.importSnapshot(snapshot)
  applyLaunchOnStartup(bootstrap.settings)
  return bootstrap
}

function registerIpc() {
  ipcMain.handle('todo:get-bootstrap', () => database.getBootstrapData())
  ipcMain.handle('todo:save', (_event, todo: TodoDraft) => database.saveTodo(todo))
  ipcMain.handle('todo:toggle', (_event, payload: { todoId: string; completed: boolean }) => database.toggleTodo(payload.todoId, payload.completed))
  ipcMain.handle('todo:delete', (_event, todoId: string) => database.deleteTodo(todoId))
  ipcMain.handle('todo:restore', (_event, todoId: string) => database.restoreTodo(todoId))
  ipcMain.handle('category:create', (_event, name: string) => database.createCategory(name))
  ipcMain.handle('tag:create', (_event, name: string) => database.createTag(name))
  ipcMain.handle('settings:update', (_event, patch: Partial<Settings>) => {
    const bootstrap = database.updateSettings(patch)
    applyLaunchOnStartup(bootstrap.settings)
    return bootstrap
  })
  ipcMain.handle('data:export', async () => {
    await exportData()
  })
  ipcMain.handle('data:import', async () => importData())
  ipcMain.handle('window:action', (_event, action: 'minimize' | 'maximize' | 'close') => {
    if (!mainWindow) {
      return
    }

    if (action === 'minimize') {
      mainWindow.minimize()
    }
    if (action === 'maximize') {
      if (mainWindow.isMaximized()) mainWindow.unmaximize()
      else mainWindow.maximize()
    }
    if (action === 'close') {
      mainWindow.close()
    }
  })

  // Recurring Todos IPC
  ipcMain.handle('recurring:get-all', () => database.getRecurringTodos())
  ipcMain.handle('recurring:create', (_event, draft: RecurringTodoDraft) => database.createRecurringTodo(draft))
  ipcMain.handle('recurring:update', (_event, { id, draft }: { id: string; draft: Partial<RecurringTodoDraft> }) => database.updateRecurringTodo(id, draft))
  ipcMain.handle('recurring:delete', (_event, id: string) => database.deleteRecurringTodo(id))
  ipcMain.handle('recurring:generate-daily', () => database.generateDailyTodos())

  // ── M1 Pomodoro IPC ──────────────────────────────────────────────────
  ipcMain.handle('pomodoro:get-settings', () => database.getPomodoroSettings())
  ipcMain.handle('pomodoro:update-settings', (_event, patch: Partial<PomodoroSettings>) => {
    const updated = database.updatePomodoroSettings(patch)
    // 快捷键改变时重新注册
    registerGlobalShortcut()
    return updated
  })
  ipcMain.handle('pomodoro:create-session', (_event, session: Omit<PomodoroSession, 'id'>) =>
    database.createPomodoroSession(session)
  )
  ipcMain.handle('pomodoro:update-session', (_event, { id, patch }: { id: string; patch: Partial<PomodoroSession> }) =>
    database.updatePomodoroSession(id, patch)
  )
  ipcMain.handle('pomodoro:get-sessions', (_event, opts: { todoId?: string; date?: string; limit?: number }) =>
    database.getPomodoroSessions(opts)
  )
  ipcMain.handle('pomodoro:get-today-sessions', () => database.getTodayPomodoroSessions())
  ipcMain.handle('pomodoro:set-active', (_event, active: boolean) => {
    isPomodoroActive = active
    // 通知健康提醒系统更新状态
    if (mainWindow) {
      mainWindow.webContents.send('pomodoro:active-changed', active)
    }
  })

  // ── M3 Health Reminder IPC ───────────────────────────────────────────
  ipcMain.handle('health:get-reminders', () => database.getHealthReminders())
  ipcMain.handle('health:create-reminder', (_event, reminder: Omit<HealthReminder, 'id'>) =>
    database.createHealthReminder(reminder)
  )
  ipcMain.handle('health:update-reminder', (_event, { id, patch }: { id: string; patch: Partial<HealthReminder> }) =>
    database.updateHealthReminder(id, patch)
  )
  ipcMain.handle('health:delete-reminder', (_event, id: string) => database.deleteHealthReminder(id))
  ipcMain.handle('health:get-history', (_event, opts: { reminderId?: string; limit?: number }) =>
    database.getReminderHistory(opts)
  )
  ipcMain.handle('health:snooze-reminder', (_event, { id, minutes }: { id: string; minutes: number }) => {
    database.recordHealthReminderTrigger(id, true, true, minutes)
  })
  ipcMain.handle('health:dismiss-reminder', (_event, id: string) => {
    database.recordHealthReminderTrigger(id, true, false)
  })

  // ── M5 AI Settings IPC ──────────────────────────────────────────────
  ipcMain.handle('ai:get-settings', () => database.getAISettings())
  ipcMain.handle('ai:update-settings', (_event, patch: Partial<AISettings>) =>
    database.updateAISettings(patch)
  )

  // ── M6 Time Block IPC ────────────────────────────────────────────────
  ipcMain.handle('timeblock:get-all', (_event, date: string) => database.getTimeBlocks(date))
  ipcMain.handle('timeblock:create', (_event, block: Omit<TimeBlock, 'id'>) =>
    database.createTimeBlock(block)
  )
  ipcMain.handle('timeblock:update', (_event, { id, patch }: { id: string; patch: Partial<TimeBlock> }) =>
    database.updateTimeBlock(id, patch)
  )
  ipcMain.handle('timeblock:delete', (_event, id: string) => database.deleteTimeBlock(id))

  // ── M4 Daily Stats IPC ──────────────────────────────────────────────
  ipcMain.handle('stats:get-daily', (_event, opts: { startDate: string; endDate: string }) =>
    database.getDailyStats({ start: opts.startDate, end: opts.endDate })
  )
  ipcMain.handle('stats:update-daily', (_event, patch: Partial<Parameters<typeof database.updateDailyStats>[0]>) =>
    database.updateDailyStats(patch as Parameters<typeof database.updateDailyStats>[0])
  )

  // ── Todo Images IPC ────────────────────────────────────────────────
  ipcMain.handle('todo:get-images', (_event, todoId: string) =>
    database.getTodoImages(todoId)
  )
  ipcMain.handle('todo:add-image', (_event, payload: { todoId: string; data: string; mimeType: string }) =>
    database.addTodoImage(payload.todoId, payload.data, payload.mimeType)
  )
  ipcMain.handle('todo:delete-image', (_event, imageId: string) =>
    database.deleteTodoImage(imageId)
  )

  // ── Project Cells IPC ─────────────────────────────────────────────
  ipcMain.handle('project:get-cells-by-month', (_event, payload: { projectId: string; yearMonth: string }) =>
    database.getProjectCellsByMonth(payload.projectId, payload.yearMonth)
  )
  ipcMain.handle('project:get-cell', (_event, payload: { projectId: string; cellDate: string }) =>
    database.getProjectCell(payload.projectId, payload.cellDate)
  )
  ipcMain.handle('project:upsert-cell', (_event, payload: { projectId: string; cellDate: string; content: string; images: string[]; isAlert: boolean }) =>
    (database.upsertProjectCell(payload.projectId, payload.cellDate, payload.content, payload.images, payload.isAlert), undefined)
  )
}

app.whenReady().then(async () => {
  await database.init(app.getPath('userData'))
  applyLaunchOnStartup(database.getBootstrapData().settings)
  registerIpc()
  await createWindow()
  createTray()
  startReminderLoop()
  startHealthReminderLoop()
  registerGlobalShortcut()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (healthReminderTimer) clearInterval(healthReminderTimer)
})

app.on('window-all-closed', () => {
  // macOS 外用户关闭窗口不退出，等托盘退出
  if (process.platform === 'darwin') {
    app.quit()
  }
})

// 声明 isQuitting 扩展属性
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean
    }
  }
}
