import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { TimeBlock, Todo } from '../../types'
import './TimeBlockView.css'

const HOUR_HEIGHT = 64  // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// ─── Helpers ────────────────────────────────────────
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function blockTop(startTime: string): number {
  return (timeToMinutes(startTime) / 60) * HOUR_HEIGHT
}

function blockHeight(startTime: string, endTime: string): number {
  const dur = timeToMinutes(endTime) - timeToMinutes(startTime)
  return Math.max((dur / 60) * HOUR_HEIGHT, 20)
}

// ─── Block Card ─────────────────────────────────────
function BlockCard({
  block,
  todos,
  onEdit,
  onDelete,
}: {
  block: TimeBlock
  todos: Todo[]
  onEdit: (block: TimeBlock) => void
  onDelete: (id: string) => void
}) {
  const linkedTodo = block.todoId ? todos.find((t) => t.id === block.todoId) : null
  const top = blockTop(block.startTime.includes('T') ? block.startTime.slice(11, 16) : block.startTime)
  const height = blockHeight(
    block.startTime.includes('T') ? block.startTime.slice(11, 16) : block.startTime,
    block.endTime.includes('T') ? block.endTime.slice(11, 16) : block.endTime,
  )

  return (
    <div
      className="time-block-card"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        background: block.color ?? 'var(--color-accent)',
      }}
      onClick={() => onEdit(block)}
    >
      <div className="block-title">{block.title}</div>
      {linkedTodo && <div className="block-todo">{linkedTodo.title}</div>}
      <div className="block-time">
        {block.startTime.includes('T') ? block.startTime.slice(11, 16) : block.startTime}
        {' – '}
        {block.endTime.includes('T') ? block.endTime.slice(11, 16) : block.endTime}
      </div>
      <button
        className="block-delete-btn"
        onClick={(e) => { e.stopPropagation(); onDelete(block.id) }}
        title="删除"
      >
        ✕
      </button>
    </div>
  )
}

// ─── Block Edit Panel ────────────────────────────────
function BlockPanel({
  block,
  date,
  todos,
  onClose,
  onSave,
}: {
  block: Partial<TimeBlock> | null
  date: string
  todos: Todo[]
  onClose: () => void
  onSave: (data: Omit<TimeBlock, 'id'>) => void
}) {
  const isNew = !block?.id
  const [form, setForm] = useState({
    title: block?.title ?? '新时间块',
    todoId: block?.todoId ?? null as string | null,
    startTime: block?.startTime?.slice(11, 16) ?? '09:00',
    endTime: block?.endTime?.slice(11, 16) ?? '10:00',
    color: block?.color ?? '#3b82f6',
    notes: block?.notes ?? '',
    isAllDay: block?.isAllDay ?? false,
    categoryId: block?.categoryId ?? null as string | null,
    actualPomodoros: block?.actualPomodoros ?? 0,
  })

  const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#e85d50', '#eab308']

  const handleSave = () => {
    onSave({
      title: form.title,
      todoId: form.todoId,
      startTime: `${date}T${form.startTime}:00`,
      endTime: `${date}T${form.endTime}:00`,
      color: form.color,
      categoryId: form.categoryId,
      isAllDay: form.isAllDay,
      notes: form.notes || null,
      actualPomodoros: form.actualPomodoros,
    })
    onClose()
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="block-panel">
        <div className="panel-header">
          <h3>{isNew ? '新建时间块' : '编辑时间块'}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="panel-body">
          <div className="form-field">
            <label>标题</label>
            <input
              className="text-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="时间块标题"
            />
          </div>
          <div className="form-field">
            <label>关联任务</label>
            <select
              className="text-input"
              value={form.todoId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, todoId: e.target.value || null }))}
            >
              <option value="">— 不关联任务 —</option>
              {todos.filter((t) => t.status === 'pending').map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>开始时间</label>
            <input
              type="time"
              className="text-input short"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>结束时间</label>
            <input
              type="time"
              className="text-input short"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>颜色</label>
            <div className="color-row">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-dot ${form.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </div>
          <div className="form-field">
            <label>备注</label>
            <textarea
              className="text-input"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="可选备注"
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
        <div className="panel-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave} disabled={!form.title.trim()}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Current Time Indicator ──────────────────────────
function NowIndicator() {
  const [top, setTop] = useState(0)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const minutes = now.getHours() * 60 + now.getMinutes()
      setTop((minutes / 60) * HOUR_HEIGHT)
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="now-indicator" style={{ top: `${top}px` }}>
      <div className="now-dot" />
      <div className="now-line" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────
export default function TimeBlockView() {
  const {
    timeBlocks,
    timeBlockDate,
    todos,
    loadTimeBlocks,
    addTimeBlock,
    updateTimeBlockLocal,
    removeTimeBlock,
    setTimeBlockDate,
  } = useAppStore()

  const [editBlock, setEditBlock] = useState<Partial<TimeBlock> | null | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTimeBlocks(timeBlockDate)
  }, [timeBlockDate])

  // 初始滚动到当前时间
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date()
      const minutes = now.getHours() * 60 + now.getMinutes()
      const scrollTop = Math.max(0, (minutes / 60) * HOUR_HEIGHT - 120)
      scrollRef.current.scrollTop = scrollTop
    }
  }, [])

  const handleSave = async (data: Omit<TimeBlock, 'id'>) => {
    if (editBlock?.id) {
      const updated = await window.todoApi.updateTimeBlock(editBlock.id, data)
      updateTimeBlockLocal(updated)
    } else {
      const created = await window.todoApi.createTimeBlock(data)
      addTimeBlock(created)
    }
  }

  const handleDelete = async (id: string) => {
    await window.todoApi.deleteTimeBlock(id)
    removeTimeBlock(id)
  }

  const changeDate = (delta: number) => {
    const d = new Date(timeBlockDate)
    d.setDate(d.getDate() + delta)
    setTimeBlockDate(d.toISOString().slice(0, 10))
  }

  const isToday = timeBlockDate === new Date().toISOString().slice(0, 10)

  const displayDate = new Date(timeBlockDate).toLocaleDateString('zh', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="timeblock-view">
      <div className="timeblock-header">
        <div className="date-nav">
          <button className="nav-btn" onClick={() => changeDate(-1)}>‹</button>
          <span className="date-label">
            {displayDate}
            {isToday && <span className="today-badge">今天</span>}
          </span>
          <button className="nav-btn" onClick={() => changeDate(1)}>›</button>
          {!isToday && (
            <button className="btn-ghost" onClick={() => setTimeBlockDate(new Date().toISOString().slice(0, 10))}>
              回到今天
            </button>
          )}
        </div>
        <button className="btn-primary" onClick={() => setEditBlock(null)}>
          + 新建时间块
        </button>
      </div>

      <div className="timeline-container" ref={scrollRef}>
        <div className="timeline" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* 小时线 */}
          {HOURS.map((h) => (
            <div key={h} className="hour-row" style={{ top: `${h * HOUR_HEIGHT}px` }}>
              <span className="hour-label">{h.toString().padStart(2, '0')}:00</span>
              <div className="hour-line" />
            </div>
          ))}

          {/* 时间块 */}
          <div className="blocks-layer">
            {timeBlocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                todos={todos}
                onEdit={(b) => setEditBlock(b)}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* 当前时间线 */}
          {isToday && <NowIndicator />}
        </div>
      </div>

      {editBlock !== undefined && (
        <BlockPanel
          block={editBlock}
          date={timeBlockDate}
          todos={todos}
          onClose={() => setEditBlock(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
