'use client'

import { useEffect, useState, useMemo } from 'react'
import { Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import { Loader2, RefreshCw, BarChart2, Tv, BookOpen } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

ChartJS.register(LinearScale, PointElement, Tooltip, Legend)

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Shared constants ──────────────────────────────────────────────────────────
const SCORE_DIST_KEYS = ['10','20','30','40','50','60','70','80','90','100']

const ANIME_AXIS_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'favourites', label: 'Favourites' },
  { value: 'mean_score', label: 'Mean Score' },
  ...SCORE_DIST_KEYS.map(k => ({ value: `score_${k}`, label: `Score ${k} (voters)` })),
]

const NOVEL_AXIS_OPTIONS = [
  { value: 'volume_count', label: 'Volume Count' },
  { value: 'votes',        label: 'Votes'        },
  { value: 'latest_year',  label: 'Latest Year'  },
]

const FORMAT_OPTIONS = ['All', 'TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL']
const SEASON_OPTIONS = ['All', 'WINTER', 'SPRING', 'SUMMER', 'FALL']

const FORMAT_COLORS: Record<string, string> = {
  TV:      'rgba(99,102,241,0.85)',
  MOVIE:   'rgba(236,72,153,0.85)',
  OVA:     'rgba(251,191,36,0.85)',
  ONA:     'rgba(34,197,94,0.85)',
  SPECIAL: 'rgba(251,146,60,0.85)',
  OTHER:   'rgba(148,163,184,0.6)',
}

// Publisher color palette (same hash approach)
const PUBLISHER_PALETTE = [
  '#6366f1','#ec4899','#f59e0b','#22c55e','#ef4444',
  '#06b6d4','#a855f7','#f97316','#14b8a6','#84cc16',
  '#3b82f6','#e11d48','#d97706','#16a34a','#dc2626',
  '#0284c7','#9333ea','#ea580c','#0d9488','#65a30d',
  '#4f46e5','#db2777','#b45309','#15803d','#b91c1c',
  '#0369a1','#7c3aed','#c2410c','#0f766e','#4d7c0f',
]

function publisherColorIndex(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % PUBLISHER_PALETTE.length
}

function publisherColor(pub: string | null): string {
  if (!pub) return 'rgba(148,163,184,0.5)'
  return PUBLISHER_PALETTE[publisherColorIndex(pub)] + 'cc'
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnimeSeries {
  id:    number
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

interface NovelRow {
  id:           number
  title:        string
  publisher:    string | null
  volume_count: number
  latest_year:  number | null
  votes:        number | null
  period:       string | null
}

interface PlotPoint {
  x:       number
  y:       number
  title:   string
  id:      number
  color:   string
  label:   string   // subtitle for tooltip (format or publisher)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseScoreDist(raw: any): Record<string, number> {
  if (!raw) return {}
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return {} } }
  return raw as Record<string, number>
}

function getAnimeValue(meta: AnimeSeries['anime_meta'], axis: string): number | null {
  if (!meta) return null
  if (axis === 'popularity') return meta.popularity ?? null
  if (axis === 'favourites') return meta.favourites ?? null
  if (axis === 'mean_score') return meta.mean_score ?? null
  if (axis.startsWith('score_')) {
    const dist = parseScoreDist(meta.score_distribution)
    return dist[axis.replace('score_', '')] ?? null
  }
  return null
}

function getNovelValue(row: NovelRow, axis: string): number | null {
  if (axis === 'volume_count') return row.volume_count ?? null
  if (axis === 'votes')        return row.votes        ?? null
  if (axis === 'latest_year')  return row.latest_year  ?? null
  return null
}

const selectStyle = {
  background: 'var(--background-secondary)',
  color:      'var(--foreground)',
  border:     '1px solid var(--card-border)',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChartsPage() {
  const [mode, setMode] = useState<'anime' | 'novel'>('anime')

  // Anime state
  const [allAnime,  setAllAnime]  = useState<AnimeSeries[]>([])
  const [animeLoading, setAnimeLoading] = useState(true)

  // Novel state
  const [allNovels, setAllNovels] = useState<NovelRow[]>([])
  const [novelLoading, setNovelLoading] = useState(true)

  const [isDark, setIsDark] = useState(false)

  // Anime controls
  const [xAxis,        setXAxis]        = useState('popularity')
  const [yAxis,        setYAxis]        = useState('mean_score')
  const [formatFilter, setFormatFilter] = useState('All')
  const [seasonFilter, setSeasonFilter] = useState('All')
  const [yearFilter,   setYearFilter]   = useState('All')
  const [animeSearch,  setAnimeSearch]  = useState('')

  // Novel controls
  const [nxAxis,         setNxAxis]         = useState('volume_count')
  const [nyAxis,         setNyAxis]         = useState('votes')
  const [periodFilter,   setPeriodFilter]   = useState('All')
  const [publisherFilter,setPublisherFilter]= useState('All')
  const [novelSearch,    setNovelSearch]    = useState('')

  // Dark mode observer
  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'))
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Fetch anime
  useEffect(() => {
    async function load() {
      setAnimeLoading(true)
      const { data, error } = await supabase
        .from('series')
        .select('id, title, anime_meta(*)')
        .eq('item_type', 'anime')
        .not('anime_meta', 'is', null)
        .limit(2000)
      if (!error && data) setAllAnime(data as any)
      setAnimeLoading(false)
    }
    load()
  }, [])

  // Fetch novels — replicates the SQL query using Supabase joins
  useEffect(() => {
    async function load() {
      setNovelLoading(true)

      // Step 1: Get all novel series with volumes
      const { data: seriesData, error: sErr } = await supabase
        .from('series')
        .select('id, title, publisher')
        .eq('item_type', 'novel')

      if (sErr || !seriesData) { setNovelLoading(false); return }

      // Step 2: Get volumes (non-special) grouped by series_id
      const seriesIds = seriesData.map(s => s.id)
      const { data: volData } = await supabase
        .from('volumes')
        .select('series_id, release_date')
        .eq('is_special', false)
        .in('series_id', seriesIds)

      // Step 3: Get voting results
      const { data: voteData } = await supabase
        .from('voting_result')
        .select('title, votes, period')

      // Build lookup maps
      const volMap: Record<number, { count: number; maxYear: number | null }> = {}
      for (const v of volData || []) {
        if (!volMap[v.series_id]) volMap[v.series_id] = { count: 0, maxYear: null }
        volMap[v.series_id].count++
        if (v.release_date) {
          const yr = new Date(v.release_date).getFullYear()
          if (!volMap[v.series_id].maxYear || yr > volMap[v.series_id].maxYear!) {
            volMap[v.series_id].maxYear = yr
          }
        }
      }

      // Parse MM/YYYY string -> sortable number (YYYYMM) for correct chronological order
      const parsePeriod = (p: string | null): number => {
        if (!p) return 0
        const parts = p.split('/')
        if (parts.length !== 2) return 0
        const mm = parseInt(parts[0]), yyyy = parseInt(parts[1])
        return isNaN(mm) || isNaN(yyyy) ? 0 : yyyy * 100 + mm
      }

      // voting_result joined by title — keep the LATEST period when duplicates exist
      const voteMap: Record<string, { votes: number; period: string }> = {}
      for (const vr of voteData || []) {
        const existing = voteMap[vr.title]
        if (!existing || parsePeriod(vr.period) > parsePeriod(existing.period)) {
          voteMap[vr.title] = { votes: Number(vr.votes) || 0, period: vr.period }
        }
      }

      const rows: NovelRow[] = seriesData.map(s => ({
        id:           s.id,
        title:        s.title,
        publisher:    s.publisher,
        volume_count: volMap[s.id]?.count    ?? 0,
        latest_year:  volMap[s.id]?.maxYear  ?? null,
        votes:        voteMap[s.title]?.votes ?? null,
        period:       voteMap[s.title]?.period ?? null,
      }))

      setAllNovels(rows)
      setNovelLoading(false)
    }
    load()
  }, [])

  // ── Anime derived data ────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const s = new Set<number>()
    allAnime.forEach(a => { if (a.anime_meta?.season_year) s.add(a.anime_meta.season_year) })
    return ['All', ...Array.from(s).sort((a, b) => b - a).map(String)]
  }, [allAnime])

  const animePoints = useMemo(() => {
    const filtered = allAnime.filter(s => {
      const m = s.anime_meta
      if (!m) return false
      if (formatFilter !== 'All' && (m.format || '').toUpperCase() !== formatFilter) return false
      if (seasonFilter !== 'All' && (m.season || '').toUpperCase() !== seasonFilter) return false
      if (yearFilter   !== 'All' && String(m.season_year) !== yearFilter) return false
      if (animeSearch  && !s.title.toLowerCase().includes(animeSearch.toLowerCase())) return false
      return true
    })
    const pts: PlotPoint[] = []
    for (const s of filtered) {
      const x = getAnimeValue(s.anime_meta, xAxis)
      const y = getAnimeValue(s.anime_meta, yAxis)
      if (x == null || y == null || isNaN(x) || isNaN(y)) continue
      const fmt = (s.anime_meta?.format || 'OTHER').toUpperCase()
      pts.push({ x, y, title: s.title, id: s.id, color: FORMAT_COLORS[fmt] ?? FORMAT_COLORS.OTHER, label: fmt })
    }
    return pts
  }, [allAnime, xAxis, yAxis, formatFilter, seasonFilter, yearFilter, animeSearch])

  // ── Novel derived data ────────────────────────────────────────────────────
  const availablePeriods = useMemo(() => {
    const s = new Set<string>()
    allNovels.forEach(n => { if (n.period) s.add(n.period) })
    // Sort MM/YYYY periods chronologically (newest first)
    return [
      'All',
      ...Array.from(s).sort((a, b) => {
        const parse = (p: string) => { const [mm, yyyy] = p.split('/'); return parseInt(yyyy||'0')*100+parseInt(mm||'0') }
        return parse(b) - parse(a)
      })
    ]
  }, [allNovels])

  const availablePublishers = useMemo(() => {
    const counts: Record<string, number> = {}
    allNovels.forEach(n => { if (n.publisher) counts[n.publisher] = (counts[n.publisher] || 0) + 1 })
    return ['All', ...Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([p]) => p)]
  }, [allNovels])

  const novelPoints = useMemo(() => {
    const filtered = allNovels.filter(n => {
      if (periodFilter    !== 'All' && n.period    !== periodFilter)    return false
      if (publisherFilter !== 'All' && n.publisher !== publisherFilter) return false
      if (novelSearch && !n.title.toLowerCase().includes(novelSearch.toLowerCase())) return false
      return true
    })
    const pts: PlotPoint[] = []
    for (const n of filtered) {
      const x = getNovelValue(n, nxAxis)
      const y = getNovelValue(n, nyAxis)
      if (x == null || y == null || isNaN(x) || isNaN(y)) continue
      pts.push({ x, y, title: n.title, id: n.id, color: publisherColor(n.publisher), label: n.publisher || 'Unknown' })
    }
    return pts
  }, [allNovels, nxAxis, nyAxis, periodFilter, publisherFilter, novelSearch])

  // ── Active points (based on mode) ────────────────────────────────────────
  const points  = mode === 'anime' ? animePoints  : novelPoints
  const loading = mode === 'anime' ? animeLoading : novelLoading

  const { medianX, medianY } = useMemo(() => {
    const xs = points.map(p => p.x).sort((a, b) => a - b)
    const ys = points.map(p => p.y).sort((a, b) => a - b)
    const mid = (arr: number[]) => arr.length ? arr[Math.floor(arr.length / 2)] : 0
    return { medianX: mid(xs), medianY: mid(ys) }
  }, [points])

  const topIds = useMemo(
    () => new Set([...points].sort((a, b) => b.y - a.y).slice(0, 15).map(p => p.id)),
    [points]
  )
  const normalPoints    = points.filter(p => !topIds.has(p.id))
  const highlightPoints = points.filter(p =>  topIds.has(p.id))

  // Novel legend: top publishers in current view
  const novelLegend = useMemo(() => {
    const counts: Record<string, number> = {}
    novelPoints.forEach(p => { counts[p.label] = (counts[p.label] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [novelPoints])

  const gridColor  = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.12)'
  const labelColor = isDark ? 'rgba(148,163,184,1)'   : 'rgba(71,85,105,1)'

  const axisLabel = (v: string) => {
    const opts = mode === 'anime' ? ANIME_AXIS_OPTIONS : NOVEL_AXIS_OPTIONS
    return opts.find(o => o.value === v)?.label ?? v
  }
  const curX = mode === 'anime' ? xAxis  : nxAxis
  const curY = mode === 'anime' ? yAxis  : nyAxis

  const chartData = {
    datasets: [
      {
        label:            'Main',
        data:             normalPoints,
        backgroundColor:  normalPoints.map(p => p.color),
        pointRadius:      5,
        pointHoverRadius: 7,
      },
      {
        label:            'Top',
        data:             highlightPoints,
        backgroundColor:  highlightPoints.map(p => p.color),
        pointRadius:      9,
        pointHoverRadius: 11,
        pointBorderColor: highlightPoints.map(p => p.color.replace('cc','ff')),
        pointBorderWidth: 2,
      },
    ],
  }

  const chartOptions: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    scales: {
      x: {
        grid:  { color: gridColor },
        ticks: { color: labelColor, maxTicksLimit: 10 },
        title: { display: true, text: axisLabel(curX), color: labelColor, font: { size: 13, weight: 600 } },
      },
      y: {
        grid:  { color: gridColor },
        ticks: { color: labelColor, maxTicksLimit: 10 },
        title: { display: true, text: axisLabel(curY), color: labelColor, font: { size: 13, weight: 600 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const r = ctx.raw as PlotPoint
            const sub = mode === 'anime' ? `Format: ${r.label}` : `Publisher: ${r.label}`
            return [r.title, sub, `${axisLabel(curX)}: ${r.x.toLocaleString()}`, `${axisLabel(curY)}: ${r.y.toLocaleString()}`]
          },
        },
        backgroundColor: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.97)',
        titleColor:      isDark ? '#f8fafc' : '#0f172a',
        bodyColor:       isDark ? '#94a3b8' : '#475569',
        borderColor:     isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 10,
        titleFont: { weight: 'bold', size: 13 },
      },
    },
  }

  const labelPlugin = useMemo(() => ({
    id: 'scatterLabels',
    afterDatasetsDraw(chart: any) {
      const ctx   = chart.ctx
      const meta1 = chart.getDatasetMeta(1)
      if (!meta1?.data?.length) return

      ctx.save()
      ctx.font = '600 11px system-ui, sans-serif'
      ctx.textBaseline = 'bottom'

      meta1.data.forEach((el: any, i: number) => {
        const pt = highlightPoints[i]
        if (!pt) return
        const { x, y } = el.getProps(['x','y'], true)
        const text  = pt.title.split(':')[0].split(' ').slice(0, 3).join(' ')
        const color = pt.color.replace('cc','ff')

        const m  = ctx.measureText(text)
        const pw = m.width + 12, ph = 18
        const px = x - pw / 2,  py = y - 15 - ph

        ctx.fillStyle   = isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.94)'
        ctx.strokeStyle = color
        ctx.lineWidth   = 1.5
        ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 4); ctx.fill(); ctx.stroke()

        ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b'
        ctx.fillText(text, x - m.width / 2, y - 15)
      })

      // Median lines
      const xScale = chart.scales.x
      const yScale = chart.scales.y
      if (!xScale || !yScale) { ctx.restore(); return }

      ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.3)'
      ctx.lineWidth   = 1.5
      ctx.setLineDash([6, 4])

      const mxPx = xScale.getPixelForValue(medianX)
      const myPx = yScale.getPixelForValue(medianY)

      ctx.beginPath(); ctx.moveTo(mxPx, yScale.top);  ctx.lineTo(mxPx, yScale.bottom); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(xScale.left, myPx); ctx.lineTo(xScale.right, myPx);  ctx.stroke()

      ctx.setLineDash([])
      ctx.restore()
    },
  }), [highlightPoints, medianX, medianY, isDark])

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
              {mode === 'anime' ? 'Anime' : 'Novel'} scatter analysis — {points.length.toLocaleString()} series plotted
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">

            {/* ── Mode switch ── */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
              <button
                onClick={() => setMode('anime')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all"
                style={mode === 'anime'
                  ? { background: '#6366f1', color: '#fff' }
                  : { background: 'var(--background-secondary)', color: 'var(--foreground-secondary)' }}
              >
                <Tv className="w-4 h-4" /> Anime
              </button>
              <button
                onClick={() => setMode('novel')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all"
                style={mode === 'novel'
                  ? { background: '#6366f1', color: '#fff' }
                  : { background: 'var(--background-secondary)', color: 'var(--foreground-secondary)' }}
              >
                <BookOpen className="w-4 h-4" /> Novel
              </button>
            </div>

            <button onClick={() => window.location.reload()} className="p-2 glass rounded-lg" title="Refresh">
              <RefreshCw className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
            </button>
          </div>
        </div>

        {/* ── Chart Card ── */}
        <div className="glass rounded-2xl overflow-hidden">

          {/* ── ANIME: Row 1 — format buttons + season / year ── */}
          {mode === 'anime' && (
            <div className="flex flex-wrap items-center gap-2 px-6 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
              {FORMAT_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setFormatFilter(f)}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={formatFilter === f
                    ? { background: '#6366f1', color: '#fff' }
                    : { ...selectStyle }}
                >
                  {f}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <select value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)} className="text-sm rounded-lg px-3 py-1.5 outline-none" style={selectStyle}>
                  {SEASON_OPTIONS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Seasons' : s}</option>)}
                </select>
                <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="text-sm rounded-lg px-3 py-1.5 outline-none" style={selectStyle}>
                  {availableYears.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── NOVEL: Row 1 — period + publisher filters ── */}
          {mode === 'novel' && (
            <div className="flex flex-wrap items-center gap-2 px-6 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>Period</span>
              <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className="text-sm rounded-lg px-3 py-1.5 outline-none" style={selectStyle}>
                {availablePeriods.map(p => <option key={p} value={p}>{p === 'All' ? 'All Periods' : p}</option>)}
              </select>

              <span className="text-xs font-semibold uppercase tracking-wide ml-2" style={{ color: 'var(--foreground-muted)' }}>Publisher</span>
              <select value={publisherFilter} onChange={e => setPublisherFilter(e.target.value)} className="text-sm rounded-lg px-3 py-1.5 outline-none max-w-[200px]" style={selectStyle}>
                {availablePublishers.map(p => <option key={p} value={p}>{p === 'All' ? 'All Publishers' : p}</option>)}
              </select>
            </div>
          )}

          {/* ── Row 2: X / Y axes + search ── */}
          <div className="flex flex-wrap items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>X</span>
              <select
                value={mode === 'anime' ? xAxis : nxAxis}
                onChange={e => mode === 'anime' ? setXAxis(e.target.value) : setNxAxis(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 outline-none min-w-[180px]"
                style={selectStyle}
              >
                {(mode === 'anime' ? ANIME_AXIS_OPTIONS : NOVEL_AXIS_OPTIONS).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>Y</span>
              <select
                value={mode === 'anime' ? yAxis : nyAxis}
                onChange={e => mode === 'anime' ? setYAxis(e.target.value) : setNyAxis(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 outline-none min-w-[180px]"
                style={selectStyle}
              >
                {(mode === 'anime' ? ANIME_AXIS_OPTIONS : NOVEL_AXIS_OPTIONS).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder={`Search ${mode === 'anime' ? 'anime' : 'novel'}…`}
              value={mode === 'anime' ? animeSearch : novelSearch}
              onChange={e => mode === 'anime' ? setAnimeSearch(e.target.value) : setNovelSearch(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 outline-none ml-auto min-w-[200px]"
              style={selectStyle}
            />
          </div>

          {/* ── Chart area ── */}
          <div className="relative px-4 pb-6 pt-4" style={{ height: '520px' }}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                  <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Loading {mode} data…</span>
                </div>
              </div>
            ) : points.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>No data for selected filters</p>
              </div>
            ) : (
              <Scatter data={chartData} options={chartOptions} plugins={[labelPlugin as any]} />
            )}
          </div>

          {/* ── Legend ── */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3" style={{ borderTop: '1px solid var(--card-border)' }}>

            {/* Anime legend: format colors */}
            {mode === 'anime' && Object.entries(FORMAT_COLORS).filter(([k]) => k !== 'OTHER').map(([fmt, color]) => (
              <div key={fmt} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{fmt}</span>
              </div>
            ))}

            {/* Novel legend: top publishers */}
            {mode === 'novel' && (
              <>
                <span className="text-xs font-semibold uppercase tracking-wide mr-1" style={{ color: 'var(--foreground-muted)' }}>Publishers</span>
                {novelLegend.map(([pub, count]) => (
                  <button
                    key={pub}
                    onClick={() => setPublisherFilter(publisherFilter === pub ? 'All' : pub)}
                    className="flex items-center gap-1.5 transition-opacity"
                    style={{ opacity: publisherFilter !== 'All' && publisherFilter !== pub ? 0.35 : 1 }}
                    title={`${count} novels — click to filter`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: publisherColor(pub) }} />
                    <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{pub}</span>
                    <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>({count})</span>
                  </button>
                ))}
              </>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="inline-block w-6 border-t-2 border-dashed" style={{ borderColor: 'rgba(148,163,184,0.5)' }} />
              <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Median</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
