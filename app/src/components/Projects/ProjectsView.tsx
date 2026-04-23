import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import './ProjectsView.css'

// ─── Helpers ────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function getYearMonth(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

const PROJECT_ID = 'default'

// ─── Tooltip ───────────────────────────────────────
function CellTooltip({ cell }: { cell: { content: string; images: string[]; isAlert: boolean } }) {
  const hasImages = cell.images?.length > 0
  const hasContent = cell.content?.trim()
  if (!hasImages && !hasContent) return null
  return (
    <div className="cell-tooltip">
      {hasContent && <p className="cell-tooltip-text">{cell.content}</p>}
      {hasImages && (
        <div className="cell-tooltip-images">
          {cell.images.slice(0, 4).map((img, i) => (
            <img key={i} src={img} alt="" />
          ))}
          {cell.images.length > 4 && (
            <span className="cell-tooltip-more">+{cell.images.length - 4} 张</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Month View ──────────────────────────────────────
function MonthView({
  year,
  month,
  onDayClick,
}: {
  year: number
  month: number
  onDayClick: (date: string) => void
}) {
  const { projectCells, loadProjectMonth, upsertProjectCell } = useAppStore()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const weekdays = ['一', '二', '三', '四', '五', '六', '日']
  const monthName = `${year}年${month + 1}月`

  // 进入月视图时批量加载当月所有格子
  useEffect(() => {
    loadProjectMonth(PROJECT_ID, getYearMonth(year, month))
  }, [year, month])

  // 置红：不进入详情，直接在月视图 toggle isAlert
  const handleToggleAlert = useCallback(async (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation()
    const key = `${PROJECT_ID}_${dateStr}`
    const cell = projectCells[key]
    const newAlert = !(cell?.isAlert ?? false)
    await upsertProjectCell(PROJECT_ID, dateStr, cell?.content ?? '', cell?.images ?? [], newAlert)
  }, [projectCells, upsertProjectCell])

  const cells: React.ReactNode[] = []
  const offset = (firstDay + 6) % 7
  for (let i = 0; i < offset; i++) {
    cells.push(<div key={`empty-${i}`} className="project-day-cell empty" />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDate(year, month, d)
    const key = `${PROJECT_ID}_${dateStr}`
    const cell = projectCells[key]
    const isToday = dateStr === new Date().toISOString().slice(0, 10)
    const hasContent = cell && (cell.content || cell.images?.length || cell.isAlert)
    const firstImage = cell?.images?.[0]
    cells.push(
      <div
        key={dateStr}
        className={`project-day-cell ${hasContent ? 'has-content' : ''} ${isToday ? 'today' : ''} ${cell?.isAlert ? 'alert' : ''}`}
        onClick={() => onDayClick(dateStr)}
      >
        <div className="project-day-top-row">
          <span className="project-day-num">{d}</span>
          {/* 置红按钮，悬停时显示 */}
          <button
            className={`project-day-alert-btn ${cell?.isAlert ? 'active' : ''}`}
            onClick={(e) => handleToggleAlert(e, dateStr)}
            title={cell?.isAlert ? '取消飘红' : '置红'}
          >
            <AlertTriangle size={11} />
          </button>
        </div>
        {/* 多图片缩略图 */}
        {cell?.images && cell.images.length > 0 && (
          <div className={`project-day-thumbs count-${Math.min(cell.images.length, 4)}`}>
            {cell.images.slice(0, 4).map((img, idx) => (
              <div key={idx} className="project-day-thumb-item">
                <img src={img} alt="" />
                {idx === 3 && cell.images.length > 4 && (
                  <span className="project-day-thumb-more">+{cell.images.length - 4}</span>
                )}
                {/* 单个图片的悬浮预览 */}
                <div className="thumb-tooltip">
                  {cell.content && <p className="thumb-tooltip-text">{cell.content}</p>}
                  <img className="thumb-tooltip-img" src={img} alt="" />
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 文字预览（无图片时） */}
        {(!cell?.images || cell.images.length === 0) && cell?.content ? (
          <span className="project-day-content-preview">{cell.content.slice(0, 20)}</span>
        ) : null}
        {/* Hover 悬浮预览（无图片仅有文字时才显示整体 tooltip） */}
        {hasContent && cell && (!cell.images || cell.images.length === 0) && <CellTooltip cell={cell} />}
      </div>
    )
  }

  return (
    <div className="projects-month-view">
      <div className="projects-month-header">
        <span>{monthName}</span>
      </div>
      <div className="projects-weekdays">
        {weekdays.map((w) => (
          <div key={w} className="projects-weekday">{w}</div>
        ))}
      </div>
      <div className="projects-day-grid">{cells}</div>
    </div>
  )
}

// ─── Day View ────────────────────────────────────────
function DayView({
  date,
  onBack,
}: {
  date: string
  onBack: () => void
}) {
  const { projectCells, loadProjectCell, upsertProjectCell } = useAppStore()
  const key = `${PROJECT_ID}_${date}`
  const cell = projectCells[key]
  const [content, setContent] = useState(cell?.content ?? '')
  const [images, setImages] = useState<string[]>(cell?.images ?? [])
  const [isAlert, setIsAlert] = useState(cell?.isAlert ?? false)
  const [dragOver, setDragOver] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDirty = useRef(false)

  useEffect(() => {
    loadProjectCell(PROJECT_ID, date)
  }, [date])

  useEffect(() => {
    setContent(cell?.content ?? '')
    setImages(cell?.images ?? [])
    setIsAlert(cell?.isAlert ?? false)
    isDirty.current = false
  }, [key, cell?.id])

  const markDirty = () => { isDirty.current = true }

  const handleSave = useCallback(async () => {
    await upsertProjectCell(PROJECT_ID, date, content, images, isAlert)
    isDirty.current = false
  }, [content, images, isAlert, date])

  const handleProcessImage = useCallback((file: File) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }, [])

  const handleImagesAdd = useCallback(async (files: FileList | File[]) => {
    const results = await Promise.all(Array.from(files).map(handleProcessImage))
    setImages((prev) => [...prev, ...results])
    markDirty()
  }, [handleProcessImage])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) handleImagesAdd(e.dataTransfer.files)
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const imageItems = Array.from(e.clipboardData.items).filter((item) => item.type.startsWith('image/'))
    if (!imageItems.length) return
    const files = imageItems.map((item) => item.getAsFile()!).filter(Boolean) as File[]
    if (files.length) handleImagesAdd(files)
  }, [handleImagesAdd])

  const handleDeleteImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
    markDirty()
  }

  const dateLabel = (() => {
    const d = new Date(date)
    return `${d.getMonth() + 1}月${d.getDate()}日 周${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}`
  })()

  return (
    <div className="projects-day-view">
      <div className="projects-day-header">
        <button className="projects-back-btn" onClick={onBack}>
          <ChevronLeft size={18} /> 返回
        </button>
        <span className="projects-day-title">{dateLabel}</span>
        <button
          className={`projects-alert-btn ${isAlert ? 'active' : ''}`}
          onClick={() => { setIsAlert(!isAlert); markDirty() }}
          title="飘红标记"
        >
          <AlertTriangle size={16} />
          飘红
        </button>
      </div>

      <div className="projects-day-body">
        {/* 文字编辑区 */}
        <textarea
          className="projects-content-input"
          placeholder="记录内容..."
          value={content}
          onChange={(e) => { setContent(e.target.value); markDirty() }}
          onPaste={handlePaste}
          onBlur={handleSave}
        />

        {/* 图片区域 */}
        <div
          className={`projects-image-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {images.length === 0 ? (
            <span className="projects-image-hint">点击上传 / 拖拽 / Ctrl+V 粘贴图片</span>
          ) : (
            <span className="projects-image-hint">+ 添加更多图片</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.length) handleImagesAdd(e.target.files); e.target.value = '' }}
          />
        </div>

        {/* 图片网格：加大 + hover预览 + 点击Lightbox */}
        {images.length > 0 && (
          <div className="projects-image-grid">
            {images.map((img, i) => (
              <div
                key={i}
                className="projects-image-item"
                onClick={() => setLightboxSrc(img)}
              >
                <img src={img} alt="" />
                <div className="projects-image-hover-mask">
                  <span className="projects-image-zoom-hint">点击查看原图</span>
                </div>
                <button
                  className="projects-image-delete"
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage(i) }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="projects-lightbox" onClick={() => setLightboxSrc(null)}>
          <button className="projects-lightbox-close" onClick={() => setLightboxSrc(null)}>
            <X size={20} />
          </button>
          <img src={lightboxSrc} alt="原图" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="projects-day-footer">
        <button className="btn btn-primary" onClick={handleSave}>
          保存
        </button>
      </div>
    </div>
  )
}

// ─── Main ProjectsView ────────────────────────────────
export function ProjectsView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  if (selectedDate) {
    return <DayView date={selectedDate} onBack={() => setSelectedDate(null)} />
  }

  return (
    <div className="projects-view">
      <div className="projects-view-header">
        <button
          className="projects-nav-btn"
          onClick={() => {
            if (month === 0) { setYear(year - 1); setMonth(11) }
            else setMonth(month - 1)
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="projects-view-title">项目集合</span>
        <button
          className="projects-nav-btn"
          onClick={() => {
            if (month === 11) { setYear(year + 1); setMonth(0) }
            else setMonth(month + 1)
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <MonthView year={year} month={month} onDayClick={setSelectedDate} />
    </div>
  )
}
