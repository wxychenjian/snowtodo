import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { HealthReminder } from '../../types'
import './HealthView.css'

const TRIGGER_TYPE_LABELS = {
  interval: '间隔提醒',
  fixed: '固定时间',
}

const NOTIFY_TYPE_LABELS = {
  notification: '系统通知',
  popup: '弹窗提醒',
  both: '通知+弹窗',
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

// ─── Health Reminder Card ──────────────────────────────
function ReminderCard({
  reminder,
  onToggle,
  onEdit,
  onDelete,
}: {
  reminder: HealthReminder
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={`health-card ${reminder.enabled ? '' : 'disabled'}`}>
      <div className="health-card-icon">{reminder.icon}</div>
      <div className="health-card-body">
        <div className="health-card-top">
          <span className="health-card-name">{reminder.name}</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={reminder.enabled} onChange={onToggle} />
            <span className="toggle-slider" />
          </label>
        </div>
        <p className="health-card-message">{reminder.message}</p>
        <div className="health-card-meta">
          <span className="meta-tag">{TRIGGER_TYPE_LABELS[reminder.triggerType]}</span>
          {reminder.triggerType === 'interval' && reminder.intervalMinutes && (
            <span className="meta-tag">每 {reminder.intervalMinutes} 分钟</span>
          )}
          {reminder.triggerType === 'fixed' && reminder.fixedTime && (
            <span className="meta-tag">🕐 {reminder.fixedTime}</span>
          )}
          {reminder.fixedDays.length > 0 && (
            <span className="meta-tag">
              {reminder.fixedDays.map((d) => `周${WEEKDAY_LABELS[d]}`).join('、')}
            </span>
          )}
          <span className="meta-tag">{NOTIFY_TYPE_LABELS[reminder.notifyType]}</span>
          {reminder.skipDuringPomodoro && (
            <span className="meta-tag skip">番茄钟时跳过</span>
          )}
        </div>
      </div>
      <div className="health-card-actions">
        <button className="icon-btn" onClick={onEdit} title="编辑">✏️</button>
        <button className="icon-btn" onClick={onDelete} title="删除">🗑️</button>
      </div>
    </div>
  )
}

// ─── Edit/Create Panel ────────────────────────────────
function ReminderPanel({
  reminder,
  onClose,
  onSave,
}: {
  reminder: Partial<HealthReminder> | null
  onClose: () => void
  onSave: (data: Omit<HealthReminder, 'id'>) => void
}) {
  const isNew = !reminder?.id
  const [form, setForm] = useState<Omit<HealthReminder, 'id'>>({
    name: reminder?.name ?? '',
    icon: reminder?.icon ?? '🔔',
    message: reminder?.message ?? '',
    enabled: reminder?.enabled ?? true,
    triggerType: reminder?.triggerType ?? 'interval',
    intervalMinutes: reminder?.intervalMinutes ?? 60,
    fixedTime: reminder?.fixedTime ?? '09:00',
    fixedDays: reminder?.fixedDays ?? [],
    notifyType: reminder?.notifyType ?? 'notification',
    skipDuringPomodoro: reminder?.skipDuringPomodoro ?? true,
    workdaysOnly: reminder?.workdaysOnly ?? false,
    weekendsOnly: reminder?.weekendsOnly ?? false,
    holidayAutoOff: reminder?.holidayAutoOff ?? false,
    sortOrder: reminder?.sortOrder ?? 99,
  })

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      fixedDays: f.fixedDays.includes(day)
        ? f.fixedDays.filter((d) => d !== day)
        : [...f.fixedDays, day],
    }))
  }

  const ICON_OPTIONS = ['💧', '🧘', '👀', '🌬️', '🍅', '🌙', '💊', '🏃', '🥤', '🍎', '💤', '🔔']

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="reminder-panel">
        <div className="panel-header">
          <h3>{isNew ? '新建提醒' : '编辑提醒'}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="panel-body">
          {/* 图标 */}
          <div className="form-field">
            <label>图标</label>
            <div className="icon-picker">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  className={`icon-option ${form.icon === ic ? 'selected' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* 名称 */}
          <div className="form-field">
            <label>名称</label>
            <input
              className="text-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="提醒名称"
            />
          </div>

          {/* 消息 */}
          <div className="form-field">
            <label>提醒内容</label>
            <input
              className="text-input"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="提醒消息"
            />
          </div>

          {/* 触发类型 */}
          <div className="form-field">
            <label>触发方式</label>
            <div className="radio-group">
              {(['interval', 'fixed'] as const).map((t) => (
                <label key={t} className="radio-label">
                  <input
                    type="radio"
                    name="triggerType"
                    checked={form.triggerType === t}
                    onChange={() => setForm((f) => ({ ...f, triggerType: t }))}
                  />
                  {TRIGGER_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </div>

          {form.triggerType === 'interval' && (
            <div className="form-field">
              <label>间隔时间（分钟）</label>
              <input
                type="number"
                className="text-input short"
                min={1}
                max={480}
                value={form.intervalMinutes ?? 60}
                onChange={(e) => setForm((f) => ({ ...f, intervalMinutes: parseInt(e.target.value) || 60 }))}
              />
            </div>
          )}

          {form.triggerType === 'fixed' && (
            <>
              <div className="form-field">
                <label>固定时间</label>
                <input
                  type="time"
                  className="text-input short"
                  value={form.fixedTime ?? '09:00'}
                  onChange={(e) => setForm((f) => ({ ...f, fixedTime: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>重复日期</label>
                <div className="weekday-picker">
                  {WEEKDAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      className={`weekday-btn ${form.fixedDays.includes(idx) ? 'active' : ''}`}
                      onClick={() => toggleDay(idx)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 通知方式 */}
          <div className="form-field">
            <label>通知方式</label>
            <select
              className="text-input"
              value={form.notifyType}
              onChange={(e) => setForm((f) => ({ ...f, notifyType: e.target.value as HealthReminder['notifyType'] }))}
            >
              {Object.entries(NOTIFY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* 附加选项 */}
          <div className="form-field toggles">
            {([
              ['skipDuringPomodoro', '番茄钟进行中跳过'],
              ['workdaysOnly', '仅工作日'],
              ['weekendsOnly', '仅周末'],
            ] as [keyof typeof form, string][]).map(([key, label]) => (
              <label key={key} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="panel-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name.trim()}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Health Reminder Popup ────────────────────────────
export function HealthReminderPopup() {
  const { pendingHealthReminder, setPendingHealthReminder } = useAppStore()

  useEffect(() => {
    const unsub = window.todoApi.onHealthReminderTriggered((reminder) => {
      if (reminder.notifyType === 'popup' || reminder.notifyType === 'both') {
        setPendingHealthReminder(reminder)
      }
    })
    return unsub
  }, [])

  if (!pendingHealthReminder) return null

  const handleSnooze = async (minutes: number) => {
    await window.todoApi.snoozeHealthReminder(pendingHealthReminder.id, minutes)
    setPendingHealthReminder(null)
  }

  const handleDismiss = async () => {
    await window.todoApi.dismissHealthReminder(pendingHealthReminder.id)
    setPendingHealthReminder(null)
  }

  return (
    <div className="health-popup-overlay">
      <div className="health-popup">
        <div className="health-popup-icon">{pendingHealthReminder.icon}</div>
        <h3>{pendingHealthReminder.name}</h3>
        <p>{pendingHealthReminder.message}</p>
        <div className="health-popup-actions">
          <button className="btn-secondary" onClick={() => handleSnooze(10)}>10分钟后提醒</button>
          <button className="btn-secondary" onClick={() => handleSnooze(30)}>30分钟后提醒</button>
          <button className="btn-primary" onClick={handleDismiss}>好的，知道了</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────
export default function HealthView() {
  const {
    healthReminders,
    loadHealthReminders,
    addHealthReminder,
    updateHealthReminderLocal,
    removeHealthReminder,
  } = useAppStore()

  const [editTarget, setEditTarget] = useState<Partial<HealthReminder> | null | undefined>(undefined)
  // undefined = closed, null = new, object = edit

  useEffect(() => {
    loadHealthReminders()
  }, [])

  const handleToggle = async (reminder: HealthReminder) => {
    const updated = await window.todoApi.updateHealthReminder(reminder.id, { enabled: !reminder.enabled })
    updateHealthReminderLocal(updated)
  }

  const handleSave = async (data: Omit<HealthReminder, 'id'>) => {
    if (editTarget?.id) {
      const updated = await window.todoApi.updateHealthReminder(editTarget.id, data)
      updateHealthReminderLocal(updated)
    } else {
      const created = await window.todoApi.createHealthReminder(data)
      addHealthReminder(created)
    }
    setEditTarget(undefined)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该提醒？')) return
    await window.todoApi.deleteHealthReminder(id)
    removeHealthReminder(id)
  }

  const enabledCount = healthReminders.filter((r) => r.enabled).length

  return (
    <div className="health-view">
      <div className="health-header">
        <div>
          <h2>💚 健康小助手</h2>
          <p className="health-subtitle">
            {enabledCount} 个提醒已启用，共 {healthReminders.length} 个
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditTarget(null)}>
          + 新建提醒
        </button>
      </div>

      <div className="health-list">
        {healthReminders.length === 0 ? (
          <div className="health-empty">
            <span>💤</span>
            <p>暂无健康提醒，点击「新建提醒」添加</p>
          </div>
        ) : (
          healthReminders
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((r) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                onToggle={() => handleToggle(r)}
                onEdit={() => setEditTarget(r)}
                onDelete={() => handleDelete(r.id)}
              />
            ))
        )}
      </div>

      {editTarget !== undefined && (
        <ReminderPanel
          reminder={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
