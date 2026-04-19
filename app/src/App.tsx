import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { Content } from './components/Content'
import { DetailPanel } from './components/DetailPanel'
import { RecurringTodoPanel } from './components/RecurringTodos'
import { HealthReminderPopup } from './components/Health/HealthView'
import './styles/design-system.css'

function App() {
  const {
    initialize,
    isInitialized,
    isRecurringPanelOpen,
    selectedRecurringTodoId,
    recurringTodos,
    closeRecurringPanel,
    loadPomodoroSettings,
    loadHealthReminders,
    loadAISettings,
  } = useAppStore()

  useEffect(() => {
    if (!isInitialized) {
      window.todoApi.getBootstrapData().then((data) => {
        initialize(data)
        // 初始化各模块数据
        loadPomodoroSettings()
        loadHealthReminders()
        loadAISettings()
      })
    }
  }, [initialize, isInitialized])

  const editingRecurringTodo = selectedRecurringTodoId
    ? recurringTodos.find((rt) => rt.id === selectedRecurringTodoId)
    : null

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Toolbar />
        <Content />
      </div>
      <DetailPanel />
      <RecurringTodoPanel
        isOpen={isRecurringPanelOpen}
        onClose={closeRecurringPanel}
        editingTodo={editingRecurringTodo}
      />
      {/* 健康提醒弹窗 */}
      <HealthReminderPopup />
    </div>
  )
}

export default App
