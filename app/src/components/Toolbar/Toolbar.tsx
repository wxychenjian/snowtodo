import { Plus, Search } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import './Toolbar.css'

const VIEW_TITLES: Record<string, string> = {
  today: '今天',
  all: '全部待办',
  upcoming: '即将到期',
  completed: '已完成',
  categories: '分类',
  tags: '标签',
  reminders: '提醒',
  settings: '设置',
}

export function Toolbar() {
  const { currentView, searchQuery, setSearchQuery, openDetailPanel, filterPriority, setFilterPriority } = useAppStore()

  const title = VIEW_TITLES[currentView] || '待办'
  const isSettings = currentView === 'settings'

  return (
    <header className="toolbar">
      <h1 className="toolbar-title">{title}</h1>

      {!isSettings && (
        <>
          <div className="toolbar-search">
            <Search className="toolbar-search-icon" size={16} />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="搜索待办..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-bar">
            <button
              className={`filter-chip ${filterPriority === null ? 'active' : ''}`}
              onClick={() => setFilterPriority(null)}
            >
              全部
            </button>
            <button
              className={`filter-chip ${filterPriority === 'high' ? 'active' : ''}`}
              onClick={() => setFilterPriority('high')}
            >
              高优先级
            </button>
            <button
              className={`filter-chip ${filterPriority === 'medium' ? 'active' : ''}`}
              onClick={() => setFilterPriority('medium')}
            >
              中优先级
            </button>
            <button
              className={`filter-chip ${filterPriority === 'low' ? 'active' : ''}`}
              onClick={() => setFilterPriority('low')}
            >
              低优先级
            </button>
          </div>

          <button
            className="toolbar-btn-primary"
            onClick={() => openDetailPanel()}
          >
            <Plus size={16} />
            新建待办
          </button>
        </>
      )}
    </header>
  )
}
