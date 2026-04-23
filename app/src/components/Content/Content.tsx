import { useAppStore } from '../../store/useAppStore'
import { TodoList } from './TodoList'
import { SettingsPage } from '../Settings/SettingsPage'
import { RemindersView } from '../Reminders/RemindersView'
import { RecurringTodosView } from '../RecurringTodos/RecurringTodosView'
import PomodoroView from '../Pomodoro/PomodoroView'
import DashboardView from '../Dashboard/DashboardView'
import HealthView from '../Health/HealthView'
import AIView from '../AI/AIView'
import TimeBlockView from '../TimeBlock/TimeBlockView'
import { ProjectsView } from '../Projects/ProjectsView'
import './Content.css'

export function Content() {
  const { currentView, isLoading } = useAppStore()

  if (isLoading) {
    return (
      <main className="content">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>加载中...</p>
        </div>
      </main>
    )
  }

  if (currentView === 'settings') {
    return <main className="content"><SettingsPage /></main>
  }
  if (currentView === 'reminders') {
    return <main className="content"><RemindersView /></main>
  }
  if (currentView === 'recurring') {
    return <main className="content"><RecurringTodosView /></main>
  }
  if (currentView === 'pomodoro') {
    return <main className="content no-padding"><PomodoroView /></main>
  }
  if (currentView === 'dashboard') {
    return <main className="content no-padding"><DashboardView /></main>
  }
  if (currentView === 'health') {
    return <main className="content no-padding"><HealthView /></main>
  }
  if (currentView === 'ai') {
    return <main className="content no-padding"><AIView /></main>
  }
  if (currentView === 'timeblock') {
    return <main className="content no-padding"><TimeBlockView /></main>
  }
  if (currentView === 'projects') {
    return <main className="content no-padding"><ProjectsView /></main>
  }

  // 所有 todo 视图（today / all / upcoming / completed / categories / tags）
  // 空状态由 TodoList 内部处理
  return (
    <main className="content">
      <TodoList />
    </main>
  )
}

