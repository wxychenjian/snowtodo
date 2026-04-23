import {
  Activity,
  BarChart2,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Heart,
  LayoutGrid,
  LayoutGridIcon,
  ListTodo,
  Repeat,
  Settings,
  Tag,
  Timer,
  Zap,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { ViewId } from '../../types'
import './Sidebar.css'

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof ListTodo; badge?: () => number }[] = [
  { id: 'today', label: '今天', icon: Calendar },
  { id: 'all', label: '全部', icon: ListTodo },
  { id: 'upcoming', label: '即将到期', icon: Timer },
  { id: 'completed', label: '已完成', icon: CheckCircle2 },
]

export function Sidebar() {
  const { currentView, setCurrentView, todos, categories, tags } = useAppStore()

  const pendingCount = todos.filter((t) => t.status === 'pending').length
  const todayCount = todos.filter((t) => {
    if (t.status !== 'pending' || !t.dueDate) return false
    return t.dueDate <= new Date().toISOString().slice(0, 10)
  }).length
  const upcomingCount = todos.filter((t) => {
    if (t.status !== 'pending' || !t.dueDate) return false
    const today = new Date().toISOString().slice(0, 10)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return t.dueDate > today && t.dueDate <= nextWeek
  }).length
  const completedCount = todos.filter((t) => t.status === 'completed').length
  const reminderCount = todos.filter((t) => {
    if (t.status !== 'pending' || !t.reminderEnabled || !t.remindAt) return false
    return new Date(t.remindAt) <= new Date()
  }).length

  const getBadge = (id: ViewId): number | undefined => {
    switch (id) {
      case 'today': return todayCount || undefined
      case 'all': return pendingCount || undefined
      case 'upcoming': return upcomingCount || undefined
      case 'completed': return completedCount || undefined
      default: return undefined
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ListTodo size={18} />
          </div>
          <span className="sidebar-logo-text">SnowTodo</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
            >
              <item.icon className="sidebar-item-icon" size={18} />
              <span>{item.label}</span>
              {getBadge(item.id) && (
                <span className="sidebar-item-badge">{getBadge(item.id)}</span>
              )}
            </div>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">效率工具</div>
          <div
            className={`sidebar-item ${currentView === 'projects' ? 'active' : ''}`}
            onClick={() => setCurrentView('projects')}
          >
            <LayoutGridIcon className="sidebar-item-icon" size={18} />
            <span>项目集合</span>
          </div>
          <div
            className={`sidebar-item ${currentView === 'pomodoro' ? 'active' : ''}`}
            onClick={() => setCurrentView('pomodoro')}
          >
            <Zap className="sidebar-item-icon" size={18} />
            <span>番茄工作法</span>
          </div>
          <div
            className={`sidebar-item ${currentView === 'timeblock' ? 'active' : ''}`}
            onClick={() => setCurrentView('timeblock')}
          >
            <Clock className="sidebar-item-icon" size={18} />
            <span>时间块视图</span>
          </div>
          <div
            className={`sidebar-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <BarChart2 className="sidebar-item-icon" size={18} />
            <span>数据仪表盘</span>
          </div>
          <div
            className={`sidebar-item ${currentView === 'health' ? 'active' : ''}`}
            onClick={() => setCurrentView('health')}
          >
            <Heart className="sidebar-item-icon" size={18} />
            <span>健康小助手</span>
          </div>
          <div
            className={`sidebar-item ${currentView === 'ai' ? 'active' : ''}`}
            onClick={() => setCurrentView('ai')}
          >
            <Bot className="sidebar-item-icon" size={18} />
            <span>AI 助手</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">管理</div>
          <div
            className={`sidebar-item ${currentView === 'recurring' ? 'active' : ''}`}
            onClick={() => setCurrentView('recurring')}
          >
            <Repeat className="sidebar-item-icon" size={18} />
            <span>每日待办</span>
          </div>
          <div
            className={`sidebar-item ${currentView === 'reminders' ? 'active' : ''}`}
            onClick={() => setCurrentView('reminders')}
          >
            <Activity className="sidebar-item-icon" size={18} />
            <span>提醒</span>
            {reminderCount > 0 && (
              <span className="sidebar-item-badge">{reminderCount}</span>
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">分类</div>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`sidebar-item ${currentView === 'categories' && useAppStore.getState().filterCategoryId === cat.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('categories')
                useAppStore.getState().setFilterCategoryId(cat.id)
              }}
            >
              <LayoutGrid className="sidebar-item-icon" size={18} />
              <span>{cat.name}</span>
              <ChevronRight className="sidebar-item-chevron" size={14} />
            </div>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">标签</div>
          {tags.slice(0, 5).map((tag) => (
            <div
              key={tag.id}
              className={`sidebar-item ${currentView === 'tags' && useAppStore.getState().filterTagId === tag.id ? 'active' : ''}`}
              onClick={() => {
                useAppStore.getState().setFilterTagId(tag.id)
                setCurrentView('tags')
              }}
            >
              <Tag className="sidebar-item-icon" size={18} />
              <span>{tag.name}</span>
            </div>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div
          className={`sidebar-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentView('settings')}
        >
          <Settings className="sidebar-item-icon" size={18} />
          <span>设置</span>
        </div>
      </div>
    </aside>
  )
}
