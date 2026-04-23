import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Trash2, Upload, Image } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { TodoDraft, Priority, RepeatRule, ReminderType } from '../../src/types'
import './DetailPanel.css'

const EMPTY_DRAFT: TodoDraft = {
  title: '',
  notes: '',
  priority: 'medium',
  categoryId: null,
  dueDate: null,
  dueTime: null,
  startDate: null,
  isPinned: false,
  repeatRule: 'none',
  reminderEnabled: false,
  reminderType: 'system',
  remindAt: null,
  tagIds: [],
}

const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
]

export function DetailPanel() {
  const {
    isDetailPanelOpen,
    closeDetailPanel,
    selectedTodoId,
    todos,
    categories,
    tags,
    settings,
    addTodo,
    updateTodo,
    removeTodo,
  } = useAppStore()

  const [draft, setDraft] = useState<TodoDraft>(EMPTY_DRAFT)
  const [newTagName, setNewTagName] = useState('')
  const [customDays, setCustomDays] = useState<number[]>([])

  const existingTodo = selectedTodoId ? todos.find((t) => t.id === selectedTodoId) : null
  const isEditing = Boolean(existingTodo)

  // ── Images ─────────────────────────────────────────────
  const [images, setImages] = useState<{ id: string; data: string; mimeType: string }[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 面板关闭时清空 Lightbox，防止残留在屏幕上
  useEffect(() => {
    if (!isDetailPanelOpen) {
      setLightboxSrc(null)
    }
  }, [isDetailPanelOpen])

  // Load images when editing
  useEffect(() => {
    if (existingTodo) {
      window.todoApi.getTodoImages(existingTodo.id).then(setImages)
    } else {
      setImages([])
    }
  }, [existingTodo?.id])

  const processImageFile = useCallback(async (file: File): Promise<{ data: string; mimeType: string } | null> => {
    if (!file.type.startsWith('image/')) return null
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ data: reader.result as string, mimeType: file.type })
      reader.readAsDataURL(file)
    })
  }, [])

  const handleImagesAdd = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    setImageLoading(true)
    const results = await Promise.all(fileArray.map(processImageFile))
    const valid = results.filter(Boolean) as { data: string; mimeType: string }[]

    if (!isEditing) {
      // For new todos, store images locally temporarily
      setImages((prev) => [...prev, ...valid])
    } else if (existingTodo) {
      // For existing todos, save to DB
      const ids = await Promise.all(valid.map((v) => window.todoApi.addTodoImage(existingTodo.id, v.data, v.mimeType)))
      setImages((prev) => [...prev, ...valid.map((v, i) => ({ id: ids[i]!, data: v.data, mimeType: v.mimeType }))])
    }
    setImageLoading(false)
  }, [isEditing, existingTodo, processImageFile])

  const handleImageDelete = useCallback(async (imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId))
    if (isEditing && imageId) {
      await window.todoApi.deleteTodoImage(imageId)
    }
  }, [isEditing])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) handleImagesAdd(e.dataTransfer.files)
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'))
    if (!imageItems.length) return
    const files = imageItems.map((item) => item.getAsFile()!).filter(Boolean) as File[]
    if (files.length) handleImagesAdd(files)
  }, [handleImagesAdd])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleImagesAdd(e.target.files)
    e.target.value = ''
  }

  useEffect(() => {
    if (existingTodo) {
      setDraft({
        id: existingTodo.id,
        title: existingTodo.title,
        notes: existingTodo.notes,
        priority: existingTodo.priority,
        categoryId: existingTodo.categoryId,
        dueDate: existingTodo.dueDate,
        dueTime: existingTodo.dueTime,
        startDate: existingTodo.startDate ?? null,
        isPinned: existingTodo.isPinned,
        repeatRule: existingTodo.repeatRule,
        customDays: existingTodo.customDays,
        reminderEnabled: existingTodo.reminderEnabled,
        reminderType: existingTodo.reminderType,
        remindAt: existingTodo.remindAt,
        tagIds: existingTodo.tagIds,
      })
      setCustomDays(existingTodo.customDays || [])
    } else {
      // 查找默认分类"工作"
      const defaultCat = categories.find((c) => c.name === '工作')
      const today = new Date().toISOString().slice(0, 10)
      setDraft({
        ...EMPTY_DRAFT,
        dueDate: today,
        dueTime: '17:30',
        categoryId: defaultCat?.id ?? null,
        reminderType: settings.defaultReminderType,
      })
      setCustomDays([])
    }
  }, [existingTodo, settings.defaultReminderType, categories])

  const handleSave = async () => {
    if (!draft.title.trim()) return

    const saveDraft: TodoDraft = {
      ...draft,
      customDays: draft.repeatRule === 'custom' ? customDays : undefined,
    }

    const result = await window.todoApi.saveTodo(saveDraft)
    if (isEditing) {
      updateTodo(result)
    } else {
      addTodo(result)
      // Save locally-stored images to DB
      for (const img of images) {
        await window.todoApi.addTodoImage(result.id, img.data, img.mimeType)
      }
    }
    closeDetailPanel()
  }

  const handleToggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const handleDelete = async () => {
    if (!selectedTodoId) return
    await window.todoApi.deleteTodo(selectedTodoId)
    removeTodo(selectedTodoId)
    closeDetailPanel()
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    const tag = await window.todoApi.createTag(newTagName.trim())
    useAppStore.getState().addTag(tag)
    setDraft((d) => ({ ...d, tagIds: [...d.tagIds, tag.id] }))
    setNewTagName('')
  }

  const toggleTag = (tagId: string) => {
    setDraft((d) => ({
      ...d,
      tagIds: d.tagIds.includes(tagId)
        ? d.tagIds.filter((id) => id !== tagId)
        : [...d.tagIds, tagId],
    }))
  }

  const priorityLabels: Record<Priority, string> = { high: '高', medium: '中', low: '低' }
  const repeatLabels: Record<RepeatRule, string> = { none: '不重复', daily: '每天', weekdays: '工作日', weekly: '每周', monthly: '每月', custom: '自定义' }
  const reminderLabels: Record<ReminderType, string> = { none: '不提醒', system: '系统通知', popup: '弹窗提醒', both: '系统+弹窗' }

  const panelTitle = isEditing ? '编辑待办' : '新建待办'

  return (
    <>
      <div
        className={`detail-panel-overlay ${isDetailPanelOpen ? 'open' : ''}`}
        onClick={closeDetailPanel}
      />
      <div className={`detail-panel ${isDetailPanelOpen ? 'open' : ''}`}>
        <div className="detail-panel-header">
          <h2 className="detail-panel-title">{panelTitle}</h2>
          <button className="detail-panel-close" onClick={closeDetailPanel}>
            <X size={18} />
          </button>
        </div>

        <div className="detail-panel-body">
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="待办标题"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="form-group">
            <textarea
              className="form-textarea"
              placeholder="添加备注..."
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              onPaste={handlePaste}
            />
          </div>

          {/* 图片上传区域 */}
          <div
            className={`image-upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageLoading ? (
              <span className="image-upload-hint">上传中...</span>
            ) : images.length === 0 ? (
              <>
                <Image size={24} className="image-upload-icon" />
                <span className="image-upload-hint">点击上传 / 拖拽图片 / Ctrl+V 粘贴</span>
              </>
            ) : (
              <span className="image-upload-hint">+ 添加更多图片</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </div>

          {/* 图片预览 */}
          {images.length > 0 && (
            <div className="image-preview-grid">
              {images.map((img) => (
                <div key={img.id} className="image-preview-item">
                  <img
                    src={img.data}
                    alt="附件"
                    onClick={(e) => { e.stopPropagation(); setLightboxSrc(img.data) }}
                  />
                  <button
                    className="image-preview-delete"
                    onClick={(e) => { e.stopPropagation(); handleImageDelete(img.id) }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Lightbox 放大预览 */}
          {lightboxSrc && (
            <div className="image-lightbox" onClick={() => setLightboxSrc(null)}>
              <button className="image-lightbox-close" onClick={() => setLightboxSrc(null)}>
                <X size={20} />
              </button>
              <img src={lightboxSrc} alt="预览" onClick={(e) => e.stopPropagation()} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">优先级</label>
            <select
              className="form-select"
              value={draft.priority}
              onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as Priority }))}
            >
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">截止日期</label>
              <input
                type="date"
                className="form-input"
                value={draft.dueDate ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value || null }))}
                min=""
              />
            </div>
            <div className="form-group">
              <label className="form-label">截止时间</label>
              <input
                type="time"
                className="form-input"
                value={draft.dueTime ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, dueTime: e.target.value || null }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              开始日期
              <span className="form-label-hint">（到此日期才出现在「今日待办」）</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={draft.startDate ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value || null }))}
              min=""
            />
          </div>

          <div className="form-group">
            <label className="form-label">分类</label>
            <select
              className="form-select"
              value={draft.categoryId ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value || null }))}
            >
              <option value="">无分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">标签</label>
            <div className="tags-container">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={`tag-chip ${draft.tagIds.includes(tag.id) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="new-tag-input">
              <input
                type="text"
                className="form-input"
                placeholder="新建标签..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <button className="btn btn-secondary" onClick={handleAddTag}>添加</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">重复</label>
            <select
              className="form-select"
              value={draft.repeatRule}
              onChange={(e) => setDraft((d) => ({ ...d, repeatRule: e.target.value as RepeatRule }))}
            >
              {Object.entries(repeatLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {draft.repeatRule === 'custom' && (
            <div className="form-group">
              <label className="form-label">选择星期</label>
              <div className="custom-weekdays">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={`custom-weekday-btn ${customDays.includes(day.value) ? 'active' : ''}`}
                    onClick={() => handleToggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {customDays.length === 0 && (
                <span className="form-hint" style={{ color: '#ef4444' }}>请至少选择一天</span>
              )}
            </div>
          )}

          <div className="form-group">
            <div className="form-toggle">
              <span className="form-toggle-label">启用提醒</span>
              <button
                className={`form-toggle-switch ${draft.reminderEnabled ? 'active' : ''}`}
                onClick={() => setDraft((d) => ({ ...d, reminderEnabled: !d.reminderEnabled }))}
              />
            </div>
          </div>

          {draft.reminderEnabled && (
            <>
              <div className="form-group">
                <label className="form-label">提醒方式</label>
                <select
                  className="form-select"
                  value={draft.reminderType}
                  onChange={(e) => setDraft((d) => ({ ...d, reminderType: e.target.value as ReminderType }))}
                >
                  {Object.entries(reminderLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">提醒时间</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={draft.remindAt ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, remindAt: e.target.value || null }))}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <div className="form-toggle">
              <span className="form-toggle-label">置顶</span>
              <button
                className={`form-toggle-switch ${draft.isPinned ? 'active' : ''}`}
                onClick={() => setDraft((d) => ({ ...d, isPinned: !d.isPinned }))}
              />
            </div>
          </div>
        </div>

        <div className="detail-panel-footer">
          {isEditing && (
            <button className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={16} />
              删除
            </button>
          )}
          <button className="btn btn-secondary" onClick={closeDetailPanel} style={{ marginLeft: 'auto' }}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!draft.title.trim()}>
            保存
          </button>
        </div>
      </div>
    </>
  )
}
