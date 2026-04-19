import { useEffect, useState } from 'react'
import {
  Plus,
  Repeat,
  Clock,
  Calendar,
  Briefcase,
  Coffee,
  Settings,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { RecurringPattern, RecurringTodo } from '../../src/types'
import './RecurringTodosView.css'

const PATTERN_LABELS: Record<RecurringPattern, string> = {
  daily: '每天',
  weekdays: '工作日',
  weekends: '周末',
  custom: '自定义',
}

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

export function RecurringTodosView() {
  const {
    recurringTodos,
    categories,
    tags,
    loadRecurringTodos,
    openRecurringPanel,
    removeRecurringTodo,
    updateRecurringTodo,
  } = useAppStore()

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadRecurringTodos().then(() => setIsLoading(false))
  }, [])

  const handleToggleActive = async (rt: RecurringTodo) => {
    const updated = await window.todoApi.updateRecurringTodo(rt.id, {
      isActive: !rt.isActive,
    })
    useAppStore.getState().updateRecurringTodo(updated)
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个每日待办吗？')) {
      await window.todoApi.deleteRecurringTodo(id)
      removeRecurringTodo(id)
    }
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null
    return categories.find((c) => c.id === categoryId)?.name
  }

  const getTagNames = (tagIds: string[]) => {
    return tagIds
      .map((id) => tags.find((t) => t.id === id)?.name)
      .filter(Boolean) as string[]
  }

  if (isLoading) {
    return (
      <div className="recurring-view">
        <div className="recurring-header">
          <h1 className="recurring-title">
            <Repeat className="recurring-title-icon" size={24} />
            每日待办
          </h1>
        </div>
        <div className="recurring-loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="recurring-view">
      <div className="recurring-header">
        <h1 className="recurring-title">
          <Repeat className="recurring-title-icon" size={24} />
          每日待办
        </h1>
        <button
          className="recurring-add-btn"
          onClick={() => openRecurringPanel()}
        >
          <Plus size={18} />
          <span>新建每日待办</span>
        </button>
      </div>

      {recurringTodos.length === 0 ? (
        <div className="recurring-empty">
          <div className="recurring-empty-icon">
            <Repeat size={48} />
          </div>
          <h3 className="recurring-empty-title">还没有每日待办</h3>
          <p className="recurring-empty-desc">
            创建每日待办，让 SnowTodo 每天自动为你生成任务
            <br />
            比如：每天发日报、每周一开会、工作日打卡等
          </p>
          <button
            className="recurring-empty-btn"
            onClick={() => openRecurringPanel()}
          >
            <Plus size={18} />
            创建第一个每日待办
          </button>
        </div>
      ) : (
        <div className="recurring-list">
          {recurringTodos.map((rt) => (
            <div
              key={rt.id}
              className={`recurring-card ${!rt.isActive ? 'inactive' : ''}`}
            >
              <div className="recurring-card-header">
                <div className="recurring-card-title-row">
                  <h3 className="recurring-card-title">{rt.title}</h3>
                  <div className="recurring-card-actions">
                    <button
                      className={`recurring-card-action ${rt.isActive ? 'active' : ''}`}
                      onClick={() => handleToggleActive(rt)}
                      title={rt.isActive ? '停用' : '启用'}
                    >
                      {rt.isActive ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                    </button>
                    <button
                      className="recurring-card-action"
                      onClick={() => openRecurringPanel(rt.id)}
                      title="编辑"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="recurring-card-action delete"
                      onClick={() => handleDelete(rt.id)}
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {rt.notes && (
                  <p className="recurring-card-notes">{rt.notes}</p>
                )}
              </div>

              <div className="recurring-card-meta">
                <div className="recurring-card-meta-item">
                  <Repeat size={14} />
                  <span>{PATTERN_LABELS[rt.pattern]}</span>
                  {rt.pattern === 'custom' && rt.customDays.length > 0 && (
                    <span className="recurring-card-weekdays">
                      {rt.customDays.map((d) => WEEKDAY_NAMES[d]).join('、')}
                    </span>
                  )}
                </div>

                {rt.reminderEnabled && rt.reminderTime && (
                  <div className="recurring-card-meta-item">
                    <Clock size={14} />
                    <span>提醒时间 {rt.reminderTime}</span>
                  </div>
                )}

                {getCategoryName(rt.categoryId) && (
                  <div className="recurring-card-meta-item">
                    <Briefcase size={14} />
                    <span>{getCategoryName(rt.categoryId)}</span>
                  </div>
                )}
              </div>

              {rt.tagIds.length > 0 && (
                <div className="recurring-card-tags">
                  {getTagNames(rt.tagIds).map((name) => (
                    <span key={name} className="recurring-card-tag">
                      {name}
                    </span>
                  ))}
                </div>
              )}

              <div className="recurring-card-footer">
                <span
                  className={`recurring-card-status ${rt.isActive ? 'active' : 'inactive'}`}
                >
                  {rt.isActive ? '启用中' : '已停用'}
                </span>
                {rt.lastGeneratedAt && (
                  <span className="recurring-card-last">
                    上次生成: {rt.lastGeneratedAt}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
