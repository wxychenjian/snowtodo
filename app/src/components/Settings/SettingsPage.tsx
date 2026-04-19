import { useAppStore } from '../../store/useAppStore'
import type { Settings } from '../../src/types'
import './SettingsPage.css'

export function SettingsPage() {
  const { settings, updateSettings, setSettings } = useAppStore()

  const handleToggle = async (key: keyof Settings) => {
    const newValue = !settings[key]
    const result = await window.todoApi.updateSettings({ [key]: newValue })
    setSettings(result.settings)
  }

  const handleSelect = async (key: keyof Settings, value: string) => {
    const result = await window.todoApi.updateSettings({ [key]: value })
    setSettings(result.settings)
  }

  const handleExport = async () => {
    await window.todoApi.exportData()
  }

  const handleImport = async () => {
    const result = await window.todoApi.importData()
    if (result) {
      useAppStore.getState().initialize(result)
    }
  }

  const sortOptions = [
    { value: 'dueSoon', label: '按截止日期' },
    { value: 'createdDesc', label: '按创建时间' },
    { value: 'priority', label: '按优先级' },
  ]

  const reminderOptions = [
    { value: 'none', label: '不提醒' },
    { value: 'system', label: '系统通知' },
    { value: 'popup', label: '弹窗提醒' },
    { value: 'both', label: '系统+弹窗' },
  ]

  return (
    <div className="settings-page animate-fadeIn">
      <section className="settings-section">
        <h3 className="settings-section-title">基本设置</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">开机自启</div>
            <div className="settings-item-desc">登录 Windows 时自动启动应用</div>
          </div>
          <div className="settings-item-control">
            <button
              className={`form-toggle-switch ${settings.launchOnStartup ? 'active' : ''}`}
              onClick={() => handleToggle('launchOnStartup')}
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">默认排序</div>
            <div className="settings-item-desc">新建待办时的默认排序方式</div>
          </div>
          <div className="settings-item-control">
            <select
              className="form-select settings-select"
              value={settings.defaultSort}
              onChange={(e) => handleSelect('defaultSort', e.target.value)}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">默认提醒方式</div>
            <div className="settings-item-desc">新建待办时的默认提醒方式</div>
          </div>
          <div className="settings-item-control">
            <select
              className="form-select settings-select"
              value={settings.defaultReminderType}
              onChange={(e) => handleSelect('defaultReminderType', e.target.value)}
            >
              {reminderOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">数据管理</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">导出数据</div>
            <div className="settings-item-desc">将所有待办数据导出为 JSON 文件</div>
          </div>
          <div className="settings-item-control">
            <button className="btn btn-secondary" onClick={handleExport}>
              导出
            </button>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">导入数据</div>
            <div className="settings-item-desc">从 JSON 文件导入待办数据</div>
          </div>
          <div className="settings-item-control">
            <button className="btn btn-secondary" onClick={handleImport}>
              导入
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">关于</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">SnowTodo</div>
            <div className="settings-item-desc">版本 0.1.0</div>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-desc">
              轻量本地待办应用，使用 Electron + React + SQLite 构建
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
