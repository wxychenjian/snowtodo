import { ListTodo, Plus } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import './Content.css'

export function WelcomeState() {
  const openDetailPanel = useAppStore((s) => s.openDetailPanel)

  return (
    <div className="welcome-state animate-fadeIn">
      <ListTodo className="welcome-icon" strokeWidth={1.5} />
      <h2 className="welcome-title">开始整理你的待办</h2>
      <p className="welcome-subtitle">
        轻触下方按钮，创建你的第一条待办。合理的任务规划，让每一天都井井有条。
      </p>
      <button className="welcome-action" onClick={() => openDetailPanel()}>
        <Plus size={18} />
        创建待办
      </button>
    </div>
  )
}
