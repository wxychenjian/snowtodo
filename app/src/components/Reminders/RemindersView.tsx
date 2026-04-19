import { Bell, Clock } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import './RemindersView.css'

export function RemindersView() {
  const { todos } = useAppStore()

  const pendingReminders = todos.filter((t) => {
    if (t.status !== 'pending' || !t.reminderEnabled || !t.remindAt) return false
    return new Date(t.remindAt) > new Date()
  }).sort((a, b) => new Date(a.remindAt!).getTime() - new Date(b.remindAt!).getTime())

  const missedReminders = todos.filter((t) => {
    if (t.status !== 'pending' || !t.reminderEnabled || !t.remindAt) return false
    return new Date(t.remindAt) <= new Date()
  })

  if (pendingReminders.length === 0 && missedReminders.length === 0) {
    return (
      <div className="reminders-empty animate-fadeIn">
        <Bell className="reminders-empty-icon" strokeWidth={1.5} />
        <h3 className="reminders-empty-title">暂无提醒</h3>
        <p className="reminders-empty-text">
          为待办设置提醒时间，在截止前收到通知
        </p>
      </div>
    )
  }

  return (
    <div className="reminders-view animate-fadeIn">
      {missedReminders.length > 0 && (
        <section className="reminders-section">
          <h3 className="reminders-section-title">
            <Clock size={16} />
            已错过
          </h3>
          <div className="reminders-list">
            {missedReminders.map((todo) => (
              <ReminderCard key={todo.id} todo={todo} status="missed" />
            ))}
          </div>
        </section>
      )}

      {pendingReminders.length > 0 && (
        <section className="reminders-section">
          <h3 className="reminders-section-title">
            <Bell size={16} />
            即将提醒
          </h3>
          <div className="reminders-list">
            {pendingReminders.map((todo) => (
              <ReminderCard key={todo.id} todo={todo} status="pending" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ReminderCard({ todo, status }: { todo: import('../../src/types').Todo; status: 'pending' | 'missed' }) {
  const { openDetailPanel } = useAppStore()
  const remindAt = todo.remindAt ? new Date(todo.remindAt) : null
  const timeUntil = remindAt ? getTimeUntil(remindAt) : ''

  return (
    <div
      className={`reminder-card ${status}`}
      onClick={() => openDetailPanel(todo.id)}
    >
      <div className="reminder-card-content">
        <div className="reminder-card-title">{todo.title}</div>
        <div className="reminder-card-time">
          {remindAt?.toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
      <div className="reminder-card-countdown">{timeUntil}</div>
    </div>
  )
}

function getTimeUntil(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff < 0) return '已过期'

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) return `${minutes}分钟后`
  if (hours < 24) return `${hours}小时后`
  return `${days}天后`
}
