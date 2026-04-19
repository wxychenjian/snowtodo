import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { DailyStats } from '../../types'
import './DashboardView.css'

// ─── Helpers ────────────────────────────────────────
function getDateRange(days: number): { start: string; end: string } {
  const end = new Date()
  const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ─── Bar Chart ───────────────────────────────────────
function BarChart({
  data,
  valueKey,
  label,
  color,
}: {
  data: DailyStats[]
  valueKey: keyof DailyStats
  label: string
  color: string
}) {
  const maxVal = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1)

  return (
    <div className="bar-chart">
      <div className="bar-chart-title">{label}</div>
      <div className="bar-chart-body">
        {data.map((d) => {
          const val = Number(d[valueKey]) || 0
          const height = Math.round((val / maxVal) * 80)
          return (
            <div key={d.date} className="bar-col" title={`${fmtDate(d.date)}: ${val}`}>
              <div
                className="bar-fill"
                style={{ height: `${Math.max(height, val > 0 ? 4 : 0)}px`, background: color }}
              />
              <span className="bar-label">{fmtDate(d.date)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Ring Chart ──────────────────────────────────────
function RingChart({
  value,
  total,
  label,
  color,
}: {
  value: number
  total: number
  label: string
  color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const r = 42
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="ring-chart">
      <svg viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="50" y="50" textAnchor="middle" dy="5" fontSize="16" fontWeight="bold" fill="var(--color-text)">
          {pct}%
        </text>
      </svg>
      <div className="ring-label">{label}</div>
      <div className="ring-detail">{value} / {total}</div>
    </div>
  )
}

// ─── Stat Block ──────────────────────────────────────
function StatBlock({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: string
  label: string
  value: number
  unit: string
  color: string
}) {
  return (
    <div className="stat-block">
      <span className="stat-block-icon">{icon}</span>
      <div className="stat-block-info">
        <span className="stat-block-value" style={{ color }}>{value}</span>
        <span className="stat-block-unit">{unit}</span>
      </div>
      <span className="stat-block-label">{label}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────
export default function DashboardView() {
  const { dailyStats, todos, loadDailyStats, todayPomodoroSessions } = useAppStore()
  const [range, setRange] = useState<7 | 14 | 30>(7)

  useEffect(() => {
    const { start, end } = getDateRange(range)
    loadDailyStats(start, end)
  }, [range])

  // 填充缺失日期（保证图表连续）
  const filledStats = useMemo<DailyStats[]>(() => {
    const { start } = getDateRange(range)
    const map = new Map(dailyStats.map((s) => [s.date, s]))
    const result: DailyStats[] = []
    for (let i = 0; i < range; i++) {
      const date = new Date(new Date(start).getTime() + i * 86400000).toISOString().slice(0, 10)
      result.push(
        map.get(date) ?? {
          id: date,
          date,
          completedCount: 0,
          totalFocusMinutes: 0,
          deepWorkMinutes: 0,
          pomodoroCount: 0,
          interruptCount: 0,
        }
      )
    }
    return result
  }, [dailyStats, range])

  // 汇总数据
  const totals = useMemo(() => {
    return filledStats.reduce(
      (acc, d) => ({
        completed: acc.completed + d.completedCount,
        focusMin: acc.focusMin + d.totalFocusMinutes,
        pomodoros: acc.pomodoros + d.pomodoroCount,
        interrupts: acc.interrupts + d.interruptCount,
      }),
      { completed: 0, focusMin: 0, pomodoros: 0, interrupts: 0 }
    )
  }, [filledStats])

  const pendingTodosCount = todos.filter((t) => t.status === 'pending').length
  const completedTodosCount = todos.filter((t) => t.status === 'completed').length
  const totalTodosCount = pendingTodosCount + completedTodosCount

  // 今日
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayStat = filledStats.find((s) => s.date === todayStr)
  const todayCompleted = todayStat?.completedCount ?? 0
  const todayFocus = todayStat?.totalFocusMinutes ?? todayPomodoroSessions.filter((s) => s.completed).reduce((a, s) => a + s.duration, 0)
  const todayPomodoros = todayStat?.pomodoroCount ?? todayPomodoroSessions.filter((s) => s.completed).length

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <h2>📊 数据仪表盘</h2>
        <div className="range-tabs">
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              className={`range-tab ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              近 {r} 天
            </button>
          ))}
        </div>
      </div>

      {/* 今日概览 */}
      <section className="dashboard-section">
        <h3>今日概览</h3>
        <div className="stat-blocks">
          <StatBlock icon="✅" label="今日完成任务" value={todayCompleted} unit="项" color="var(--color-success)" />
          <StatBlock icon="🍅" label="完成番茄" value={todayPomodoros} unit="个" color="var(--color-accent)" />
          <StatBlock icon="⏱️" label="专注时长" value={todayFocus} unit="分钟" color="#8b5cf6" />
          <StatBlock icon="📋" label="待处理任务" value={pendingTodosCount} unit="项" color="var(--color-warning)" />
        </div>
      </section>

      {/* 趋势图表 */}
      <section className="dashboard-section">
        <h3>趋势分析</h3>
        <div className="charts-grid">
          <BarChart data={filledStats} valueKey="completedCount" label="每日完成任务数" color="var(--color-success)" />
          <BarChart data={filledStats} valueKey="totalFocusMinutes" label="每日专注时长（分钟）" color="var(--color-accent)" />
          <BarChart data={filledStats} valueKey="pomodoroCount" label="每日番茄数" color="#f97316" />
          <BarChart data={filledStats} valueKey="interruptCount" label="每日中断次数" color="var(--color-error)" />
        </div>
      </section>

      {/* 周期汇总 + 环形图 */}
      <section className="dashboard-section">
        <h3>周期汇总（近 {range} 天）</h3>
        <div className="summary-row">
          <RingChart
            value={completedTodosCount}
            total={totalTodosCount}
            label="任务完成率"
            color="var(--color-success)"
          />
          <RingChart
            value={totals.pomodoros}
            total={Math.max(totals.pomodoros + totals.interrupts, 1)}
            label="番茄完成率"
            color="var(--color-accent)"
          />
          <div className="summary-list">
            <div className="summary-item">
              <span className="summary-icon">✅</span>
              <span className="summary-text">完成任务</span>
              <span className="summary-val">{totals.completed} 项</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">🍅</span>
              <span className="summary-text">番茄数量</span>
              <span className="summary-val">{totals.pomodoros} 个</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">⏱️</span>
              <span className="summary-text">专注总时长</span>
              <span className="summary-val">{Math.round(totals.focusMin / 60)} 小时 {totals.focusMin % 60} 分</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">⚡</span>
              <span className="summary-text">中断次数</span>
              <span className="summary-val">{totals.interrupts} 次</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">📅</span>
              <span className="summary-text">日均专注</span>
              <span className="summary-val">{Math.round(totals.focusMin / range)} 分钟</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">🏆</span>
              <span className="summary-text">日均完成</span>
              <span className="summary-val">{(totals.completed / range).toFixed(1)} 项</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
