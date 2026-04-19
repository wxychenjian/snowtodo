import { useState, useEffect } from 'react'
import {
  X,
  Repeat,
  Clock,
  Briefcase,
  Tag,
  AlertCircle,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { RecurringPattern, RecurringTodo, RecurringTodoDraft } from '../../src/types'
import './RecurringTodoPanel.css'

const PATTERNS: { value: RecurringPattern; label: string; desc: string }[] = [
  { value: 'daily', label: '每天', desc: '每天都会生成此待办' },
  { value: 'weekdays', label: '工作日', desc: '周一至周五生成' },
  { value: 'weekends', label: '周末', desc: '周六和周日生成' },
  { value: 'custom', label: '自定义', desc: '选择特定的星期几' },
]

const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
]

const REMINDER_TYPES = [
  { value: 'none', label: '不提醒' },
  { value: 'system', label: '系统通知' },
  { value: 'popup', label: '到点弹窗' },
  { value: 'both', label: '系统通知 + 弹窗' },
]

interface RecurringTodoPanelProps {
  isOpen: boolean
  onClose: () => void
  editingTodo?: RecurringTodo | null
}

export function RecurringTodoPanel({ isOpen, onClose, editingTodo }: RecurringTodoPanelProps) {
  const { categories, tags, addRecurringTodo, updateRecurringTodo } = useAppStore()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [pattern, setPattern] = useState<RecurringPattern>('daily')
  const [customDays, setCustomDays] = useState<number[]>([])
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderType, setReminderType] = useState<'none' | 'system' | 'popup' | 'both'>('system')
  const [reminderTime, setReminderTime] = useState('09:00')
  const [isActive, setIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (editingTodo) {
      setTitle(editingTodo.title)
      setNotes(editingTodo.notes)
      setPriority(editingTodo.priority)
      setCategoryId(editingTodo.categoryId)
      setSelectedTagIds(editingTodo.tagIds)
      setPattern(editingTodo.pattern)
      setCustomDays(editingTodo.customDays)
      setReminderEnabled(editingTodo.reminderEnabled)
      setReminderType(editingTodo.reminderType)
      setReminderTime(editingTodo.reminderTime || '09:00')
      setIsActive(editingTodo.isActive)
    } else {
      // Reset to defaults
      setTitle('')
      setNotes('')
      setPriority('medium')
      setCategoryId(null)
      setSelectedTagIds([])
      setPattern('daily')
      setCustomDays([])
      setReminderEnabled(false)
      setReminderType('system')
      setReminderTime('09:00')
      setIsActive(true)
    }
  }, [editingTodo, isOpen])

  const handleToggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleSave = async () => {
    if (!title.trim()) return

    setIsSaving(true)

    const draft: RecurringTodoDraft = {
      title: title.trim(),
      notes: notes.trim(),
      priority,
      categoryId,
      tagIds: selectedTagIds,
      pattern,
      customDays: pattern === 'custom' ? customDays : [],
      reminderEnabled,
      reminderType,
      reminderTime: reminderEnabled ? reminderTime : null,
      isActive,
    }

    try {
      if (editingTodo) {
        const updated = await window.todoApi.updateRecurringTodo(editingTodo.id, draft)
        updateRecurringTodo(updated)
      } else {
        const created = await window.todoApi.createRecurringTodo(draft)
        addRecurringTodo(created)
      }
      onClose()
    } catch (err) {
      console.error('Failed to save recurring todo:', err)
      alert('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = title.trim() && (pattern !== 'custom' || customDays.length > 0)

  if (!isOpen) return null

  return (
    <div className="recurring-panel-overlay" onClick={onClose}>
      <div
        className="recurring-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="recurring-panel-header">
          <h2 className="recurring-panel-title">
            <Repeat size={20} />
            {editingTodo ? '编辑每日待办' : '新建每日待办'}
          </h2>
          <button className="recurring-panel-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="recurring-panel-body">
          {/* Title */}
          <div className="recurring-field">
            <label className="recurring-label">
              标题 <span className="required">*</span>
            </label>
            <input
              type="text"
              className="recurring-input"
              placeholder="例如：发送日报"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Notes */}
          <div className="recurring-field">
            <label className="recurring-label">备注</label>
            <textarea
              className="recurring-textarea"
              placeholder="添加详细描述..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Pattern */}
          <div className="recurring-field">
            <label className="recurring-label">重复规则</label>
            <div className="recurring-pattern-list">
              {PATTERNS.map((p) => (
                <div
                  key={p.value}
                  className={`recurring-pattern-item ${pattern === p.value ? 'active' : ''}`}
                  onClick={() => setPattern(p.value)}
                >
                  <div className="recurring-pattern-radio">
                    {pattern === p.value && <div className="recurring-pattern-dot" />}
                  </div>
                  <div className="recurring-pattern-info">
                    <div className="recurring-pattern-name">{p.label}</div>
                    <div className="recurring-pattern-desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Days */}
          {pattern === 'custom' && (
            <div className="recurring-field">
              <label className="recurring-label">选择星期</label>
              <div className="recurring-weekdays">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={`recurring-weekday ${customDays.includes(day.value) ? 'active' : ''}`}
                    onClick={() => handleToggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {customDays.length === 0 && (
                <div className="recurring-error">
                  <AlertCircle size={14} />
                  请至少选择一天
                </div>
              )}
            </div>
          )}

          {/* Reminder */}
          <div className="recurring-field">
            <label className="recurring-label">提醒设置</label>
            <div className="recurring-reminder-row">
              <label className="recurring-toggle">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                />
                <span className="recurring-toggle-slider" />
                <span className="recurring-toggle-label">启用提醒</span>
              </label>
              {reminderEnabled && (
                <input
                  type="time"
                  className="recurring-time-input"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              )}
            </div>
            {reminderEnabled && (
              <div className="recurring-reminder-types">
                {REMINDER_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`recurring-reminder-type ${reminderType === type.value ? 'active' : ''}`}
                    onClick={() => setReminderType(type.value as any)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="recurring-field">
            <label className="recurring-label">优先级</label>
            <div className="recurring-priority-list">
              {[
                { value: 'low', label: '低', color: '#22c55e' },
                { value: 'medium', label: '中', color: '#f59e0b' },
                { value: 'high', label: '高', color: '#ef4444' },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`recurring-priority ${priority === p.value ? 'active' : ''}`}
                  onClick={() => setPriority(p.value as any)}
                  style={{ '--priority-color': p.color } as any}
                >
                  <span
                    className="recurring-priority-dot"
                    style={{ background: p.color }}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="recurring-field">
            <label className="recurring-label">分类</label>
            <select
              className="recurring-select"
              value={categoryId || ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
            >
              <option value="">无分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="recurring-field">
            <label className="recurring-label">标签</label>
            <div className="recurring-tags">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`recurring-tag ${selectedTagIds.includes(tag.id) ? 'active' : ''}`}
                  onClick={() => handleToggleTag(tag.id)}
                >
                  {selectedTagIds.includes(tag.id) && <Check size={12} />}
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active Status */}
          <div className="recurring-field">
            <label className="recurring-label">状态</label>
            <label className="recurring-toggle">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="recurring-toggle-slider" />
              <span className="recurring-toggle-label">
                {isActive ? '启用' : '停用'}
              </span>
            </label>
          </div>
        </div>

        <div className="recurring-panel-footer">
          <button className="recurring-btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="recurring-btn-primary"
            onClick={handleSave}
            disabled={!isValid || isSaving}
          >
            {isSaving ? '保存中...' : editingTodo ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  )
}
