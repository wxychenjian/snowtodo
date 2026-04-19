import { ClipboardList } from 'lucide-react'
import './Content.css'

export function EmptyState({ message = '暂无待办事项' }: { message?: string }) {
  return (
    <div className="empty-state animate-fadeIn">
      <ClipboardList className="empty-icon" strokeWidth={1.5} />
      <p className="empty-text">{message}</p>
    </div>
  )
}
