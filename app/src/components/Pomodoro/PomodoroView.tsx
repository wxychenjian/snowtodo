import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { PomodoroPhase } from '../../types'
import type { PomodoroSession, PomodoroSettings, Todo } from '../../types'
import './PomodoroView.css'

// ------------------------------------------------
// Sub-components
// ------------------------------------------------

function PhaseLabel({ phase }: { phase: PomodoroPhase }) {
  const labels: Record<PomodoroPhase, string> = {
    idle: '准备开始',
    focus: '专注中',
    shortBreak: '短休息',
    longBreak: '长休息',
  }
  const colors: Record<PomodoroPhase, string> = {
    idle: 'var(--color-text-secondary)',
    focus: 'var(--color-accent)',
    shortBreak: 'var(--color-success)',
    longBreak: '#8b5cf6',
  }
  return (
    <span className="pomodoro-phase-label" style={{ color: colors[phase] }}>
      {labels[phase]}
    </span>
  )
}

function CircleTimer({
  secondsLeft,
  totalSeconds,
  phase,
}: {
  secondsLeft: number
  totalSeconds: number
  phase: PomodoroPhase
}) {
  const radius = 110
  const circumference = 2 * Math.PI * radius
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 1
  const strokeDashoffset = circumference * (1 - progress)

  const phaseColor: Record<PomodoroPhase, string> = {
    idle: 'var(--color-border)',
    focus: 'var(--color-accent)',
    shortBreak: 'var(--color-success)',
    longBreak: '#8b5cf6',
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const seconds = (secondsLeft % 60).toString().padStart(2, '0')

  return (
    <div className="pomodoro-circle-container">
      <svg className="pomodoro-circle-svg" viewBox="0 0 260 260">
        {/* 背景圆 */}
        <circle
          cx="130" cy="130" r={radius}
          fill="none" stroke="var(--color-border)" strokeWidth="8"
        />
        {/* 进度圆 */}
        <circle
          cx="130" cy="130" r={radius}
          fill="none"
          stroke={phaseColor[phase]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease', transformOrigin: 'center', transform: 'rotate(-90deg)' }}
        />
      </svg>
      <div className="pomodoro-time-display">
        <span className="pomodoro-time-digits">{minutes}:{seconds}</span>
        <PhaseLabel phase={phase} />
      </div>
    </div>
  )
}

// ------------------------------------------------
// Settings Panel
// ------------------------------------------------
function SettingsPanel({
  settings,
  onClose,
  onSave,
}: {
  settings: PomodoroSettings
  onClose: () => void
  onSave: (patch: Partial<PomodoroSettings>) => void
}) {
  const [draft, setDraft] = useState({ ...settings })

  const handleSave = () => {
    onSave(draft)
    onClose()
  }

  return (
    <div className="pomodoro-settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pomodoro-settings-panel">
        <div className="pomodoro-settings-header">
          <h3>番茄钟设置</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="pomodoro-settings-body">
          {[
            { key: 'focusDuration', label: '专注时长（分钟）', min: 1, max: 120 },
            { key: 'shortBreakDuration', label: '短休息时长（分钟）', min: 1, max: 30 },
            { key: 'longBreakDuration', label: '长休息时长（分钟）', min: 1, max: 60 },
            { key: 'longBreakInterval', label: '长休息周期（番茄数）', min: 1, max: 10 },
          ].map(({ key, label, min, max }) => (
            <div className="settings-field" key={key}>
              <label>{label}</label>
              <div className="settings-number-input">
                <button onClick={() => setDraft((d) => ({ ...d, [key]: Math.max(min, (d as Record<string, number>)[key] - 1) }))}>−</button>
                <span>{(draft as Record<string, number>)[key]}</span>
                <button onClick={() => setDraft((d) => ({ ...d, [key]: Math.min(max, (d as Record<string, number>)[key] + 1) }))}>+</button>
              </div>
            </div>
          ))}

          <div className="settings-field">
            <label>全局快捷键</label>
            <input
              className="settings-input"
              value={draft.globalShortcut}
              onChange={(e) => setDraft((d) => ({ ...d, globalShortcut: e.target.value }))}
              placeholder="如 Ctrl+Shift+P"
            />
          </div>

          <div className="settings-field">
            <label>声音提醒</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={draft.soundEnabled}
                onChange={(e) => setDraft((d) => ({ ...d, soundEnabled: e.target.checked }))}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
        <div className="pomodoro-settings-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------
// Main Component
// ------------------------------------------------
export default function PomodoroView() {
  const {
    pomodoroSettings,
    pomodoroPhase,
    pomodoroSecondsLeft,
    pomodoroSession,
    pomodoroActiveTodoId,
    todayPomodoroSessions,
    todos,
    loadPomodoroSettings,
    loadTodayPomodoroSessions,
    setPomodoroSettings,
    setPomodoroPhase,
    setPomodoroSecondsLeft,
    tickPomodoro,
    setPomodoroSession,
    setPomodoroActiveTodoId,
    addPomodoroSession,
  } = useAppStore()

  const [isRunning, setIsRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [interruptReason, setInterruptReason] = useState('')
  const [showInterruptInput, setShowInterruptInput] = useState(false)
  const [interruptCount, setInterruptCount] = useState(0)

  const sessionStartRef = useRef<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSessionRef = useRef<string | null>(null)  // DB session ID

  // 总秒数（用于环形进度）
  const totalSeconds = useCallback(() => {
    switch (pomodoroPhase) {
      case 'focus': return pomodoroSettings.focusDuration * 60
      case 'shortBreak': return pomodoroSettings.shortBreakDuration * 60
      case 'longBreak': return pomodoroSettings.longBreakDuration * 60
      default: return pomodoroSettings.focusDuration * 60
    }
  }, [pomodoroPhase, pomodoroSettings])

  useEffect(() => {
    loadPomodoroSettings()
    loadTodayPomodoroSessions()
  }, [])

  // 监听全局快捷键
  useEffect(() => {
    const unsubscribe = window.todoApi.onPomodoroToggle(() => {
      handleToggle()
    })
    return unsubscribe
  }, [isRunning, pomodoroPhase])

  // 计时器
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        tickPomodoro()
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  // 时间归零 → 自动进入下一阶段
  useEffect(() => {
    if (pomodoroSecondsLeft === 0 && isRunning) {
      handlePhaseComplete()
    }
  }, [pomodoroSecondsLeft, isRunning])

  const handlePhaseComplete = async () => {
    setIsRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)

    if (pomodoroPhase === 'focus') {
      // 保存番茄session
      const endTime = new Date().toISOString()
      const startTime = sessionStartRef.current ?? endTime
      const duration = pomodoroSettings.focusDuration

      const session = await window.todoApi.createPomodoroSession({
        todoId: pomodoroActiveTodoId,
        startTime,
        endTime,
        duration,
        plannedDuration: duration,
        completed: true,
        interruptCount,
        interruptReason: interruptCount > 0 ? interruptReason : null,
        workType: 'deep',
      })
      addPomodoroSession(session)

      const nextSession = pomodoroSession + 1
      setPomodoroSession(nextSession)

      // 通知 main 进程更新 pomodoro 活跃状态
      await window.todoApi.setPomodoroActive(false)

      // 决定下一阶段
      if (nextSession % pomodoroSettings.longBreakInterval === 0) {
        setPomodoroPhase('longBreak')
      } else {
        setPomodoroPhase('shortBreak')
      }

      // 声音提醒
      if (pomodoroSettings.soundEnabled) {
        playBeep()
      }
    } else {
      // 休息结束 → 回到空闲或自动开始
      setPomodoroPhase('idle')
      setPomodoroSecondsLeft(pomodoroSettings.focusDuration * 60)
    }

    sessionStartRef.current = null
    setInterruptCount(0)
    setInterruptReason('')
  }

  const handleToggle = () => {
    if (pomodoroPhase === 'idle') {
      // 开始专注
      setPomodoroPhase('focus')
      sessionStartRef.current = new Date().toISOString()
      window.todoApi.setPomodoroActive(true)
      setIsRunning(true)
    } else if (isRunning) {
      setIsRunning(false)
      window.todoApi.setPomodoroActive(false)
    } else {
      setIsRunning(true)
      window.todoApi.setPomodoroActive(true)
    }
  }

  const handleStop = () => {
    if (pomodoroPhase === 'focus' && isRunning) {
      setShowInterruptInput(true)
      setIsRunning(false)
      window.todoApi.setPomodoroActive(false)
    } else {
      resetTimer()
    }
  }

  const handleInterruptConfirm = async () => {
    setShowInterruptInput(false)
    const endTime = new Date().toISOString()
    const startTime = sessionStartRef.current ?? endTime
    const elapsed = Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
    )
    const session = await window.todoApi.createPomodoroSession({
      todoId: pomodoroActiveTodoId,
      startTime,
      endTime,
      duration: elapsed,
      plannedDuration: pomodoroSettings.focusDuration,
      completed: false,
      interruptCount: interruptCount + 1,
      interruptReason: interruptReason || null,
      workType: 'deep',
    })
    addPomodoroSession(session)
    resetTimer()
  }

  const resetTimer = () => {
    setIsRunning(false)
    setPomodoroPhase('idle')
    setPomodoroSecondsLeft(pomodoroSettings.focusDuration * 60)
    sessionStartRef.current = null
    setInterruptCount(0)
    setInterruptReason('')
    window.todoApi.setPomodoroActive(false)
  }

  const handleSaveSettings = async (patch: Partial<PomodoroSettings>) => {
    const updated = await window.todoApi.updatePomodoroSettings(patch)
    setPomodoroSettings(updated)
    if (pomodoroPhase === 'idle') {
      setPomodoroSecondsLeft(updated.focusDuration * 60)
    }
  }

  // 今日统计
  const completedToday = todayPomodoroSessions.filter((s) => s.completed).length
  const totalFocusMin = todayPomodoroSessions
    .filter((s) => s.completed)
    .reduce((acc, s) => acc + s.duration, 0)

  const pendingTodos: Todo[] = todos.filter((t) => t.status === 'pending').slice(0, 20)

  return (
    <div className="pomodoro-view">
      <div className="pomodoro-header">
        <h2>🍅 番茄工作法</h2>
        <button className="icon-btn" onClick={() => setShowSettings(true)} title="设置">⚙️</button>
      </div>

      <div className="pomodoro-main">
        {/* 环形计时器 */}
        <CircleTimer
          secondsLeft={pomodoroSecondsLeft}
          totalSeconds={totalSeconds()}
          phase={pomodoroPhase}
        />

        {/* 番茄计数 */}
        <div className="pomodoro-count-row">
          {Array.from({ length: pomodoroSettings.longBreakInterval }).map((_, i) => (
            <span
              key={i}
              className={`pomodoro-dot ${i < (pomodoroSession % pomodoroSettings.longBreakInterval) ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* 关联任务选择 */}
        <div className="pomodoro-task-select">
          <select
            value={pomodoroActiveTodoId ?? ''}
            onChange={(e) => setPomodoroActiveTodoId(e.target.value || null)}
            disabled={pomodoroPhase !== 'idle'}
          >
            <option value="">— 选择关联任务 —</option>
            {pendingTodos.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* 控制按钮 */}
        <div className="pomodoro-controls">
          <button
            className={`pomodoro-btn-main ${isRunning ? 'running' : ''}`}
            onClick={handleToggle}
          >
            {pomodoroPhase === 'idle' ? '开始专注' : isRunning ? '暂停' : '继续'}
          </button>
          {pomodoroPhase !== 'idle' && (
            <button className="pomodoro-btn-stop" onClick={handleStop}>
              {pomodoroPhase === 'focus' ? '中断' : '重置'}
            </button>
          )}
        </div>

        {/* 中断原因输入 */}
        {showInterruptInput && (
          <div className="pomodoro-interrupt-box">
            <p>记录一下中断原因（可选）</p>
            <input
              className="settings-input"
              value={interruptReason}
              onChange={(e) => setInterruptReason(e.target.value)}
              placeholder="如：临时接了个电话..."
              autoFocus
            />
            <div className="interrupt-actions">
              <button className="btn-secondary" onClick={() => { setShowInterruptInput(false); resetTimer() }}>跳过</button>
              <button className="btn-primary" onClick={handleInterruptConfirm}>确认中断</button>
            </div>
          </div>
        )}
      </div>

      {/* 今日统计 */}
      <div className="pomodoro-stats">
        <div className="stat-card">
          <span className="stat-value">{completedToday}</span>
          <span className="stat-label">完成番茄</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalFocusMin}</span>
          <span className="stat-label">专注分钟</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {todayPomodoroSessions.reduce((a, s) => a + s.interruptCount, 0)}
          </span>
          <span className="stat-label">中断次数</span>
        </div>
      </div>

      {/* 今日记录 */}
      {todayPomodoroSessions.length > 0 && (
        <div className="pomodoro-history">
          <h4>今日记录</h4>
          {todayPomodoroSessions.slice(0, 8).map((s) => (
            <div key={s.id} className={`history-item ${s.completed ? '' : 'interrupted'}`}>
              <span className="history-icon">{s.completed ? '🍅' : '💧'}</span>
              <span className="history-duration">{s.duration} 分钟</span>
              {s.todoId && (
                <span className="history-todo">
                  {todos.find((t) => t.id === s.todoId)?.title ?? ''}
                </span>
              )}
              <span className="history-time">
                {new Date(s.startTime).toLocaleTimeString('zh', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {showSettings && (
        <SettingsPanel
          settings={pomodoroSettings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  )
}

// 简单蜂鸣音
function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start()
    osc.stop(ctx.currentTime + 0.8)
  } catch {
    // ignore
  }
}
