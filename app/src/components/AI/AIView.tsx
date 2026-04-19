import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { AIChatMessage, AISettings, Todo } from '../../types'
import './AIView.css'

const PROVIDER_LABELS: Record<AISettings['provider'], string> = {
  openai: 'OpenAI',
  claude: 'Claude (Anthropic)',
  qwen: '通义千问',
  wenxin: '文心一言',
  custom: '自定义接口',
}

// ─── Settings Panel ───────────────────────────────────
function AISettingsPanel({
  settings,
  onClose,
  onSave,
}: {
  settings: AISettings
  onClose: () => void
  onSave: (patch: Partial<AISettings>) => void
}) {
  const [draft, setDraft] = useState({ ...settings })

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ai-settings-panel">
        <div className="panel-header">
          <h3>AI 设置</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="panel-body">
          <div className="form-field">
            <label>服务提供商</label>
            <select
              className="text-input"
              value={draft.provider}
              onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value as AISettings['provider'] }))}
            >
              {Object.entries(PROVIDER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>API 地址</label>
            <input
              className="text-input"
              value={draft.apiUrl}
              onChange={(e) => setDraft((d) => ({ ...d, apiUrl: e.target.value }))}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="form-field">
            <label>API Key</label>
            <input
              className="text-input"
              type="password"
              value={draft.apiKey}
              onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
              placeholder="sk-..."
            />
          </div>
          <div className="form-field">
            <label>模型名称</label>
            <input
              className="text-input"
              value={draft.model}
              onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
              placeholder="gpt-4o"
            />
          </div>
          <div className="form-field">
            <label>Temperature</label>
            <div className="slider-row">
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={draft.temperature}
                onChange={(e) => setDraft((d) => ({ ...d, temperature: parseFloat(e.target.value) }))}
              />
              <span className="slider-val">{draft.temperature.toFixed(1)}</span>
            </div>
          </div>
          <div className="form-field">
            <label>代理地址</label>
            <input
              className="text-input"
              value={draft.proxy ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, proxy: e.target.value || null }))}
              placeholder="http://127.0.0.1:7890（可选）"
            />
          </div>
        </div>
        <div className="panel-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={() => { onSave(draft); onClose() }}>保存</button>
        </div>
      </div>
    </div>
  )
}

// ─── Chat Message ─────────────────────────────────────
function ChatBubble({ msg }: { msg: AIChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
      <div className="chat-bubble-content">
        {msg.content.split('\n').map((line, i) => (
          <p key={i} style={{ margin: '0 0 4px' }}>{line}</p>
        ))}
      </div>
      <span className="chat-time">
        {new Date(msg.timestamp).toLocaleTimeString('zh', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────
export default function AIView() {
  const { aiSettings, isAISettingsLoaded, loadAISettings, setAISettings, todos } = useAppStore()
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content: '你好！我是你的 AI 任务助手 🤖\n\n我可以帮你：\n• 分析当前任务列表，提供优先级建议\n• 将复杂任务拆分为子任务\n• 制定番茄钟工作计划\n• 回答任何关于时间管理的问题\n\n请先在右上角设置 API Key，然后开始对话吧！',
      timestamp: new Date().toISOString(),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAISettingsLoaded) loadAISettings()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildSystemPrompt = () => {
    const pendingTodos = todos
      .filter((t) => t.status === 'pending')
      .slice(0, 20)
      .map((t: Todo) => `- [${t.priority}] ${t.title}${t.dueDate ? ` (截止: ${t.dueDate})` : ''}`)
      .join('\n')

    return `你是一个专业的效率助手，专注于帮助用户管理任务和提升工作效率。
你了解番茄工作法、GTD、时间块管理等效率方法。

当前用户的待处理任务：
${pendingTodos || '（暂无待处理任务）'}

请用简洁、友好的中文回复。如果用户要求拆分任务，请给出具体可执行的子任务列表。`
  }

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return
    if (!aiSettings?.apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ 请先点击右上角的设置按钮，配置 API Key 后再开始对话。',
          timestamp: new Date().toISOString(),
        },
      ])
      return
    }

    const userMsg: AIChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)

    try {
      const history = messages
        .filter((m) => m.role !== 'system')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch(`${aiSettings.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiSettings.apiKey}`,
        },
        body: JSON.stringify({
          model: aiSettings.model || 'gpt-4o-mini',
          temperature: aiSettings.temperature,
          max_tokens: aiSettings.maxTokens || 1024,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            ...history,
            { role: 'user', content: userMsg.content },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content ?? '（无返回内容）'

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ 请求失败：${(err as Error).message}\n\n请检查 API 设置是否正确。`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async (patch: Partial<AISettings>) => {
    const updated = await window.todoApi.updateAISettings(patch)
    setAISettings(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 快捷指令
  const QUICK_COMMANDS = [
    { label: '📋 分析今日任务', cmd: '请分析我当前的待处理任务，给出今日优先级建议和番茄钟计划' },
    { label: '✂️ 拆分复杂任务', cmd: '帮我找出最复杂的任务并拆分为具体可执行的子任务' },
    { label: '💡 效率建议', cmd: '根据我的任务情况，给出提升工作效率的具体建议' },
  ]

  return (
    <div className="ai-view">
      <div className="ai-header">
        <div>
          <h2>🤖 AI 智能助手</h2>
          <p className="ai-subtitle">
            {aiSettings?.provider ? `已连接：${PROVIDER_LABELS[aiSettings.provider]}` : '未配置 API'}
          </p>
        </div>
        <div className="ai-header-actions">
          <button className="btn-ghost" onClick={() => setMessages(messages.slice(0, 1))}>
            🗑️ 清空对话
          </button>
          <button className="btn-primary" onClick={() => setShowSettings(true)}>
            ⚙️ 设置
          </button>
        </div>
      </div>

      {/* 快捷指令 */}
      <div className="quick-commands">
        {QUICK_COMMANDS.map((q) => (
          <button
            key={q.label}
            className="quick-cmd-btn"
            onClick={() => setInputText(q.cmd)}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* 对话区 */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} />
        ))}
        {isLoading && (
          <div className="chat-bubble assistant">
            <div className="chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
          rows={2}
          disabled={isLoading}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          ➤
        </button>
      </div>

      {showSettings && aiSettings && (
        <AISettingsPanel
          settings={aiSettings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  )
}
