'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import { Loader2, RefreshCw, BarChart2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

ChartJS.register(LinearScale, PointElement, Tooltip, Legend)

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Constants ─────────────────────────────────────────────────────────────────
const SCORE_DIST_KEYS = ['10','20','30','40','50','60','70','80','90','100']

const AXIS_OPTIONS = [
  { value: 'popularity',   label: 'Popularity' },
  { value: 'favourites',   label: 'Favourites' },
  { value: 'mean_score',   label: 'Mean Score' },
  ...SCORE_DIST_KEYS.map(k => ({
    value: `score_${k}`,
    label: `Score ${k} (voters)`,
  })),
]

const FORMAT_OPTIONS = ['All', 'TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL']

const SEASON_OPTIONS = ['All', 'WINTER', 'SPRING', 'SUMMER', 'FALL']

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnimeSeries {
  id: number
  title: string
  anime_meta: {
    popularity:         number | null
    favourites:         number | null
    mean_score:         number | null
    format:             string | null
    season:             string | null
    season_year:        number | null
    score_distribution: Record<string, number> | string | null
  } | null
}

interface PlotPoint {
  x:     number
  y:     number
  title: string
  id:    number
  format: string
}

// Parse score_distribution — it might be a string or already an object
function parseScoreDist(raw: any): Record<string, number> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw as Record<string, number>
}

function getValue(meta: AnimeSeries['anime_meta'], axis: string): number | null {
  if (!meta) return null
  if (axis === 'popularity')  return meta.popularity  ?? null
  if (axis === 'favourites')  return meta.favourites  ?? null
  if (axis === 'mean_score')  return meta.mean_score  ?? null
  if (axis.startsWith('score_')) {
    const key = axis.replace('score_', '')
    const dist = parseScoreDist(meta.score_distribution)
    return dist[key] ?? null
  }
  return null
}

const FORMAT_COLORS: Record<string, string> = {
  TV:      'rgba(99,102,241,0.85)',
  MOVIE:   'rgba(236,72,153,0.85)',
  OVA:     'rgba(251,191,36,0.85)',
  ONA:     'rgba(34,197,94,0.85)',
  SPECIAL: 'rgba(251,146,60,0.85)',
  OTHER:   'rgba(148,163,184,0.6)',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChartsPage() {
  const [allSeries,  setAllSeries]  = useState<AnimeSeries[]>([])
  const [loading,    setLoading]    = useState(true)
  const [isDark,     setIsDark]     = useState(false)

  // Controls
  const [xAxis,       setXAxis]       = useState('popularity')
  const [yAxis,       setYAxis]       = useState('mean_score')
  const [formatFilter, setFormatFilter] = useState('All')
  const [seasonFilter, setSeasonFilter] = useState('All')
  const [yearFilter,   setYearFilter]   = useState('All')
  const [search,       setSearch]       = useState('')

  // Track dark mode
  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'))
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Fetch all anime with anime_meta
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('series')
        .select('id, title, anime_meta(*)')
        .eq('item_type', 'anime')
        .not('anime_meta', 'is', null)
        .limit(2000)

      if (!error && data) setAllSeries(data as any)
      setLoading(false)
    }
    load()
  }, [])

  // Unique years for filter
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    allSeries.forEach(s => {
      if (s.anime_meta?.season_year) years.add(s.anime_meta.season_year)
    })
    return ['All', ...Array.from(years).sort((a, b) => b - a).map(String)]
  }, [allSeries])

  // Build scatter points
  const { points, medianX, medianY } = useMemo(() => {
    let filtered = allSeries.filter(s => {
      const m = s.anime_meta
      if (!m) return false
      if (formatFilter !== 'All' && (m.format || '').toUpperCase() !== formatFilter) return false
      if (seasonFilter !== 'All' && (m.season || '').toUpperCase() !== seasonFilter) return false
      if (yearFilter   !== 'All' && String(m.season_year) !== yearFilter) return false
      if (search) {
        if (!s.title.toLowerCase().includes(search.toLowerCase())) return false
      }
      return true
    })

    const pts: PlotPoint[] = []
    for (const s of filtered) {
      const x = getValue(s.anime_meta, xAxis)
      const y = getValue(s.anime_meta, yAxis)
      if (x == null || y == null || isNaN(x) || isNaN(y)) continue
      pts.push({
        x,
        y,
        title:  s.title,
        id:     s.id,
        format: (s.anime_meta?.format || 'OTHER').toUpperCase(),
      })
    }

    // Medians for reference lines
    const xs = pts.map(p => p.x).sort((a, b) => a - b)
    const ys = pts.map(p => p.y).sort((a, b) => a - b)
    const mid = (arr: number[]) => arr.length ? arr[Math.floor(arr.length / 2)] : 0

    return { points: pts, medianX: mid(xs), medianY: mid(ys) }
  }, [allSeries, xAxis, yAxis, formatFilter, seasonFilter, yearFilter, search])

  // Top 15 by y-axis value get labeled
  const topPoints = useMemo(() =>
    [...points].sort((a, b) => b.y - a.y).slice(0, 15),
    [points]
  )
  const topIds = useMemo(() => new Set(topPoints.map(p => p.id)), [topPoints])

  // Split into normal + highlighted datasets
  const normalPoints    = points.filter(p => !topIds.has(p.id))
  const highlightPoints = points.filter(p =>  topIds.has(p.id))

  const gridColor  = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.12)'
  const labelColor = isDark ? 'rgba(148,163,184,1)'   : 'rgba(71,85,105,1)'
  const axisLabel  = (v: string) => AXIS_OPTIONS.find(o => o.value === v)?.label ?? v

  const chartData = {
    datasets: [
      {
        label: 'Anime',
        data: normalPoints,
        backgroundColor: isDark ? 'rgba(99,149,210,0.45)' : 'rgba(79,124,191,0.4)',
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Top',
        data: highlightPoints,
        backgroundColor: highlightPoints.map(p => FORMAT_COLORS[p.format] ?? FORMAT_COLORS.OTHER),
        pointRadius: 8,
        pointHoverRadius: 10,
      },
    ],
  }

  const chartOptions: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    scales: {
      x: {
        grid:   { color: gridColor },
        ticks:  { color: labelColor, maxTicksLimit: 10 },
        title:  { display: true, text: axisLabel(xAxis), color: labelColor, font: { size: 13, weight: 600 } },
      },
      y: {
        grid:   { color: gridColor },
        ticks:  { color: labelColor, maxTicksLimit: 10 },
        title:  { display: true, text: axisLabel(yAxis), color: labelColor, font: { size: 13, weight: 600 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const raw = ctx.raw as PlotPoint
            return [`${raw.title}`, `${axisLabel(xAxis)}: ${raw.x.toLocaleString()}`, `${axisLabel(yAxis)}: ${raw.y.toLocaleString()}`]
          },
        },
        backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
        titleColor:       isDark ? '#f8fafc' : '#0f172a',
        bodyColor:        isDark ? '#94a3b8' : '#475569',
        borderColor:      isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 10,
        titleFont: { weight: 'bold', size: 13 },
      },
    },
  }

  // Custom plugin to draw labels on top points + median dashed lines
  const labelPlugin = {
    id: 'scatterLabels',
    afterDatasetsDraw(chart: any) {
      const ctx = chart.ctx
      const meta1 = chart.getDatasetMeta(1) // highlighted points
      if (!meta1?.data?.length) return

      ctx.save()
      ctx.font = '600 11px system-ui, sans-serif'
      ctx.textBaseline = 'bottom'

      meta1.data.forEach((el: any, i: number) => {
        const pt = highlightPoints[i]
        if (!pt) return
        const { x, y } = el.getProps(['x', 'y'], true)
        const text = pt.title.split(':')[0].split(' ').slice(0, 3).join(' ')
        const color = FORMAT_COLORS[pt.format] ?? FORMAT_COLORS.OTHER

        // Pill background
        const metrics = ctx.measureText(text)
        const pw = metrics.width + 12, ph = 18
        const px = x - pw / 2, py = y - 14 - ph

        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)'
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(px, py, pw, ph, 4)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b'
        ctx.fillText(text, x - metrics.width / 2, y - 14)
      })

      // Median dashed lines
      const xScale = chart.scales.x
      const yScale = chart.scales.y
      if (!xScale || !yScale) return

      const mxPx = xScale.getPixelForValue(medianX)
      const myPx = yScale.getPixelForValue(medianY)

      ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.3)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])

      ctx.beginPath()
      ctx.moveTo(mxPx, yScale.top)
      ctx.lineTo(mxPx, yScale.bottom)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(xScale.left, myPx)
      ctx.lineTo(xScale.right, myPx)
      ctx.stroke()

      ctx.setLineDash([])
      ctx.restore()
    },
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <BarChart2 className="w-8 h-8 text-primary-500" />
              Charts
            </h1>
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Anime scatter analysis — {points.length.toLocaleString()} series plotted
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 md:mt-0 p-2 glass rounded-lg transition-colors self-start"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
          </button>
        </div>

        {/* ── Chart Card ── */}
        <div className="glass rounded-2xl overflow-hidden">

          {/* ── Format filter (like position buttons in image) ── */}
          <div
            className="flex flex-wrap items-center gap-2 px-6 py-4"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            {FORMAT_OPTIONS.map(f => (
              <button
                key={f}
                onClick={() => setFormatFilter(f)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={
                  formatFilter === f
                    ? { background: '#6366f1', color: '#fff' }
                    : { background: 'var(--background-secondary)', color: 'var(--foreground-secondary)', border: '1px solid var(--card-border)' }
                }
              >
                {f}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* Season filter */}
              <select
                value={seasonFilter}
                onChange={e => setSeasonFilter(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 outline-none"
                style={{ background: 'var(--background-secondary)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
              >
                {SEASON_OPTIONS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Seasons' : s}</option>)}
              </select>

              {/* Year filter */}
              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 outline-none"
                style={{ background: 'var(--background-secondary)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
              >
                {availableYears.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>)}
              </select>
            </div>
          </div>

          {/* ── Axis + Search controls ── */}
          <div
            className="flex flex-wrap items-center gap-3 px-6 py-4"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            {/* X axis */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>X</span>
              <select
                value={xAxis}
                onChange={e => setXAxis(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 outline-none min-w-[180px]"
                style={{ background: 'var(--background-secondary)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
              >
                {AXIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Y axis */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>Y</span>
              <select
                value={yAxis}
                onChange={e => setYAxis(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 outline-none min-w-[180px]"
                style={{ background: 'var(--background-secondary)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
              >
                {AXIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search anime…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 outline-none ml-auto min-w-[200px]"
              style={{ background: 'var(--background-secondary)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
            />
          </div>

          {/* ── Chart ── */}
          <div className="relative px-4 pb-6 pt-4" style={{ height: '520px' }}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                  <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Loading anime data…</span>
                </div>
              </div>
            ) : points.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>No data for selected filters</p>
              </div>
            ) : (
              <Scatter
                data={chartData}
                options={chartOptions}
                plugins={[labelPlugin as any]}
              />
            )}
          </div>

          {/* ── Legend ── */}
          <div
            className="flex flex-wrap items-center gap-4 px-6 py-3"
            style={{ borderTop: '1px solid var(--card-border)' }}
          >
            {Object.entries(FORMAT_COLORS).filter(([k]) => k !== 'OTHER').map(([fmt, color]) => (
              <div key={fmt} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{fmt}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-4">
              <span className="inline-block w-6 border-t-2 border-dashed" style={{ borderColor: 'rgba(148,163,184,0.5)' }} />
              <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Median</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
