/// <reference types="vite/client" />

import type { BootstrapData, ReminderEvent, Settings, TodoDraft } from './types'

declare global {
  interface Window {
    todoApi: {
      getBootstrapData: () => Promise<BootstrapData>
      saveTodo: (todo: TodoDraft) => Promise<BootstrapData>
      toggleTodo: (todoId: string, completed: boolean) => Promise<BootstrapData>
      deleteTodo: (todoId: string) => Promise<BootstrapData>
      restoreTodo: (todoId: string) => Promise<BootstrapData>
      createCategory: (name: string) => Promise<BootstrapData>
      createTag: (name: string) => Promise<BootstrapData>
      updateSettings: (patch: Partial<Settings>) => Promise<BootstrapData>
      exportData: () => Promise<void>
      importData: () => Promise<BootstrapData | null>
      windowAction: (action: 'minimize' | 'maximize' | 'close') => Promise<void>
      onReminderTriggered: (callback: (event: ReminderEvent) => void) => () => void
    }
  }
}

export {}
