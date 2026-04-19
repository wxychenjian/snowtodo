import { Calendar, Check, ListTodo, Pin, Plus, Tag as TagIcon } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Todo } from '../../types'
import './Content.css'

// 各视图的空状态文案
const EMPTY_MESSAGES: Record<string, { title: string; subtitle: string; showCreate: boolean }> = {
  today:      { title: '今天没有待办', subtitle: '休息一下，或新建一条今日任务', showCreate: true },
  all:        { title: '开始整理你的待办', subtitle: '轻触下方按钮，创建你的第一条待办。合理的任务规划，让每一天都井井有条。', showCreate: true },
  upcoming:   { title: '近期没有到期任务', subtitle: '所有待办都不在接下来 7 天内到期', showCreate: false },
  completed:  { title: '还没有完成的任务', subtitle: '完成一条待办后会在这里显示', showCreate: false },
  categories: { title: '该分类下没有任务', subtitle: '可以在创建待办时选择此分类', showCreate: true },
  tags:       { title: '该标签下没有任务', subtitle: '可以在创建待办时添加此标签', showCreate: true },
}

export function TodoList() {
  const {
    getFilteredTodos, getTodayTodos, getUpcomingTodos, getCompletedTodos,
    getTodosByCategory, getTodosByTag,
    currentView, filterCategoryId, filterTagId,
    categories, tags, openDetailPanel, updateTodo,
  } = useAppStore()

  let todos: Todo[] = []

  let completedTodos: Todo[] = []
  switch (currentView) {
    case 'today':      todos = getTodayTodos(); break
    case 'all':        todos = getFilteredTodos(); break
    case 'upcoming':   todos = getUpcomingTodos(); break
    case 'completed':  completedTodos = getCompletedTodos(); break
    case 'categories': {
      const all = filterCategoryId ? getTodosByCategory(filterCategoryId) : []
      todos = all.filter((t) => t.status === 'pending')
      completedTodos = all.filter((t) => t.status === 'completed')
      break
    }
    case 'tags': {
      const all = filterTagId ? getTodosByTag(filterTagId) : []
      todos = all.filter((t) => t.status === 'pending')
      completedTodos = all.filter((t) => t.status === 'completed')
      break
    }
    default: todos = []
  }

  // 空状态：pending 和 completed 都为空才显示
  if (todos.length === 0 && completedTodos.length === 0) {
    const msg = EMPTY_MESSAGES[currentView] ?? { title: '暂无内容', subtitle: '', showCreate: false }
    return (
      <div className="welcome-state animate-fadeIn">
        <ListTodo className="welcome-icon" strokeWidth={1.5} />
        <h2 className="welcome-title">{msg.title}</h2>
        {msg.subtitle && <p className="welcome-subtitle">{msg.subtitle}</p>}
        {msg.showCreate && (
          <button className="welcome-action" onClick={() => openDetailPanel()}>
            <Plus size={18} />
            创建待办
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
      {completedTodos.map((todo) => (
        <CompletedTodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  )
}

function TodoItem({ todo }: { todo: Todo }) {
  const { openDetailPanel, updateTodo, categories, tags } = useAppStore()

  const category = todo.categoryId ? categories.find((c) => c.id === todo.categoryId) : null
  const todoTags = tags.filter((t) => todo.tagIds.includes(t.id))

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const result = await window.todoApi.toggleTodo(todo.id, true)
    updateTodo(result)
  }

  const priorityLabels = { high: '高', medium: '中', low: '低' }

  return (
    <div
      className={`todo-item ${todo.isPinned ? 'pinned' : ''}`}
      onClick={() => openDetailPanel(todo.id)}
    >
      <div
        className="todo-checkbox"
        onClick={handleToggle}
        role="button"
        aria-label="完成待办"
      >
        <Check size={12} style={{ opacity: 0 }} />
      </div>

      <div className="todo-content">
        <div className="todo-title">{todo.title}</div>

        <div className="todo-meta">
          {todo.dueDate && (
            <span className="todo-meta-item">
              <Calendar size={12} />
              {todo.dueDate}
              {todo.dueTime && ` ${todo.dueTime}`}
            </span>
          )}
          {category && (
            <span className="todo-meta-item">
              {category.name}
            </span>
          )}
          <span className={`todo-meta-item priority-${todo.priority}`}>
            {priorityLabels[todo.priority]}优先级
          </span>
        </div>

        {todoTags.length > 0 && (
          <div className="todo-tags">
            {todoTags.map((tag) => (
              <span key={tag.id} className="todo-tag">
                <TagIcon size={10} />
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={`todo-priority-indicator ${todo.priority}`} />

      {todo.isPinned && (
        <Pin size={14} className="todo-pin-icon" />
      )}
    </div>
  )
}

function CompletedTodoItem({ todo }: { todo: Todo }) {
  const { openDetailPanel, updateTodo, categories } = useAppStore()

  const category = todo.categoryId ? categories.find((c) => c.id === todo.categoryId) : null

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const result = await window.todoApi.toggleTodo(todo.id, false)
    updateTodo(result)
  }

  return (
    <div
      className="todo-item completed"
      onClick={() => openDetailPanel(todo.id)}
    >
      <div
        className="todo-checkbox checked"
        onClick={handleRestore}
        role="button"
        aria-label="恢复待办"
      >
        <Check size={12} />
      </div>

      <div className="todo-content">
        <div className="todo-title">{todo.title}</div>

        <div className="todo-meta">
          {category && (
            <span className="todo-meta-item">{category.name}</span>
          )}
          {todo.completedAt && (
            <span className="todo-meta-item">
              已完成于 {new Date(todo.completedAt).toLocaleDateString('zh-CN')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
