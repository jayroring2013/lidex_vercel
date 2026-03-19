'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Loader2, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ─────────────────────────────────────────────────────────────────────
type ItemType = 'anime' | 'manga' | 'novel'
type SortDir  = 'asc' | 'desc' | null

interface Row {
  id:           number
  title:        string
  item_type:    string
  studio:       string | null
  publisher:    string | null
  status:       string | null
  // anime fields
  mean_score:   number | null
  popularity:   number | null
  favourites:   number | null
  episodes:     number | null
  duration_min: number | null
  format:       string | null
  season:       string | null
  season_year:  number | null
  // novel fields
  volume_count: number | null
  votes:        number | null
  avg_price:    number | null
}

// ── Column definitions ────────────────────────────────────────────────────────
interface ColDef {
  key:     keyof Row
  label:   string
  short:   string
  numeric: boolean
  unit?:   string
  invert?: boolean  // lower = better (e.g. popularity rank)
}

const ANIME_COLS: ColDef[] = [
  { key: 'mean_score',   label: 'Mean Score',  short: 'SCORE',    numeric: true  },
  { key: 'popularity',   label: 'Popularity',  short: 'POP.',     numeric: true, invert: true },
  { key: 'favourites',   label: 'Favourites',  short: 'FAVS',     numeric: true  },
  { key: 'episodes',     label: 'Episodes',    short: 'EPS',      numeric: true  },
  { key: 'duration_min', label: 'Duration',    short: 'DUR.',     numeric: true, unit: 'min' },
  { key: 'format',       label: 'Format',      short: 'FORMAT',   numeric: false },
  { key: 'season',       label: 'Season',      short: 'SEASON',   numeric: false },
  { key: 'status',       label: 'Status',      short: 'STATUS',   numeric: false },
]

const MANGA_COLS: ColDef[] = [
  { key: 'mean_score',  label: 'Mean Score',  short: 'SCORE',    numeric: true  },
  { key: 'popularity',  label: 'Popularity',  short: 'POP.',     numeric: true, invert: true },
  { key: 'favourites',  label: 'Favourites',  short: 'FAVS',     numeric: true  },
  { key: 'status',      label: 'Status',      short: 'STATUS',   numeric: false },
  { key: 'publisher',   label: 'Publisher',   short: 'PUBLISHER',numeric: false },
]

const NOVEL_COLS: ColDef[] = [
  { key: 'volume_count', label: 'Volumes',    short: 'VOLS',     numeric: true  },
  { key: 'votes',        label: 'Votes',      short: 'VOTES',    numeric: true  },
  { key: 'avg_price',    label: 'Avg Price',  short: 'AVG ₫',    numeric: true, unit: '₫' },
  { key: 'publisher',    label: 'Publisher',  short: 'PUBLISHER',numeric: false },
  { key: 'status',       label: 'Status',     short: 'STATUS',   numeric: false },
]

const COLS: Record<ItemType, ColDef[]> = {
  anime: ANIME_COLS,
  manga: MANGA_COLS,
  novel: NOVEL_COLS,
}

const FORMAT_OPTIONS = ['All', 'TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL']
const SEASON_OPTIONS  = ['All', 'WINTER', 'SPRING', 'SUMMER', 'FALL']
const STATUS_OPTIONS  = ['All', 'ongoing', 'completed', 'cancelled', 'hiatus']

const sel = {
  background: 'var(--background-secondary)',
  color:      'var(--foreground)',
  border:     '1px solid var(--card-border)',
}

// ── Percentile coloring ───────────────────────────────────────────────────────
function usePercentiles(rows: Row[], keys: (keyof Row)[]) {
  return useMemo(() => {
    const maps: Partial<Record<keyof Row, number[]>> = {}
    for (const key of keys) {
      maps[key] = rows
        .map(r => r[key] as number | null)
        .filter((v): v is number => v != null)
        .sort((a, b) => a - b)
    }
    return maps
  }, [rows, keys])
}

function getPct(value: number, sorted: number[]): number {
  if (!sorted.length) return 50
  const rank = sorted.filter(v => v <= value).length
  return (rank / sorted.length) * 100
}

function pctColor(pct: number, invert = false): string {
  const p = invert ? 100 - pct : pct
  if (p >= 80) return '#4ade80'  // green
  if (p >= 60) return '#86efac'  // light green
  if (p >= 40) return 'var(--foreground)'
  if (p >= 20) return '#fca5a5'  // light red
  return '#f87171'               // red
}

function fmtVal(col: ColDef, val: any): string {
  if (val == null || val === '') return '—'
  if (col.numeric) {
    const n = Number(val)
    if (col.key === 'popularity') return `#${n.toLocaleString()}`
    if (col.key === 'avg_price')  return n.toLocaleString() + ' ₫'
    if (col.key === 'favourites' || col.key === 'votes') {
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
      if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
      return String(n)
    }
    if (col.unit) return `${n.toLocaleString()} ${col.unit}`
    return n.toLocaleString()
  }
  return String(val).toUpperCase()
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function IndexPage() {
  const [type,       setType]       = useState<ItemType>('anime')
  const [allRows,    setAllRows]    = useState<Row[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [sortKey,    setSortKey]    = useState<keyof Row>('mean_score')
  const [sortDir,    setSortDir]    = useState<SortDir>('desc')
  const [sidebarOpen,setSidebarOpen]= useState(true)

  // Filters
  const [formatF,    setFormatF]    = useState('All')
  const [seasonF,    setSeasonF]    = useState('All')
  const [statusF,    setStatusF]    = useState('All')
  const [yearF,      setYearF]      = useState('All')
  const [publisherF, setPublisherF] = useState('All')
  const [minScore,   setMinScore]   = useState(0)
  const [minPop,     setMinPop]     = useState(0)
  const [maxPop,     setMaxPop]     = useState(999999)
  const [minEps,     setMinEps]     = useState(0)
  const [minVols,    setMinVols]    = useState(0)

  // Fetch data when type changes
  useEffect(() => {
    async function load() {
      setLoading(true)
      setAllRows([])

      if (type === 'anime') {
        const { data } = await supabase
          .from('series')
          .select('id, title, item_type, studio, status, anime_meta(mean_score, popularity, favourites, episodes, duration_min, format, season, season_year)')
          .eq('item_type', 'anime')
          .limit(3000)
        if (data) setAllRows(data.map((s: any) => ({
          ...s,
          mean_score:   s.anime_meta?.mean_score   ?? null,
          popularity:   s.anime_meta?.popularity   ?? null,
          favourites:   s.anime_meta?.favourites   ?? null,
          episodes:     s.anime_meta?.episodes     ?? null,
          duration_min: s.anime_meta?.duration_min ?? null,
          format:       s.anime_meta?.format       ?? null,
          season:       s.anime_meta?.season       ? `${s.anime_meta.season} ${s.anime_meta.season_year ?? ''}`.trim() : null,
          season_year:  s.anime_meta?.season_year  ?? null,
          volume_count: null, votes: null, avg_price: null, publisher: null,
        })))

      } else if (type === 'manga') {
        const { data } = await supabase
          .from('series')
          .select('id, title, item_type, publisher, status, anime_meta(mean_score, popularity, favourites)')
          .eq('item_type', 'manga')
          .limit(3000)
        if (data) setAllRows(data.map((s: any) => ({
          ...s,
          mean_score:   s.anime_meta?.mean_score  ?? null,
          popularity:   s.anime_meta?.popularity  ?? null,
          favourites:   s.anime_meta?.favourites  ?? null,
          episodes: null, duration_min: null, format: null,
          season: null, season_year: null, studio: null,
          volume_count: null, votes: null, avg_price: null,
        })))

      } else {
        // Novel — join volumes + voting_result in memory
        const [{ data: sData }, { data: vData }, { data: vtData }] = await Promise.all([
          supabase.from('series').select('id, title, item_type, publisher, status').eq('item_type', 'novel').limit(2000),
          supabase.from('volumes').select('series_id, price').eq('is_special', false).limit(20000),
          supabase.from('voting_result').select('title, votes, period').limit(5000),
        ])

        const volMap: Record<number, { count: number; priceSum: number }> = {}
        for (const v of vData || []) {
          if (!volMap[v.series_id]) volMap[v.series_id] = { count: 0, priceSum: 0 }
          volMap[v.series_id].count++
          volMap[v.series_id].priceSum += Number(v.price) || 0
        }
        const parsePeriod = (p: string) => { const [mm,yy] = p.split('/'); return parseInt(yy)*100+parseInt(mm) }
        const voteMap: Record<string, number> = {}
        for (const vr of vtData || []) {
          if (!voteMap[vr.title] || parsePeriod(vr.period) > parsePeriod(voteMap[vr.title] as any)) {
            voteMap[vr.title] = Number(vr.votes) || 0
          }
        }
        // rebuild with correct latest votes
        const latestVote: Record<string, { votes: number }> = {}
        for (const vr of vtData || []) {
          if (!latestVote[vr.title]) latestVote[vr.title] = { votes: 0 }
          const cur = parsePeriod(vr.period)
          const prev = latestVote[vr.title] as any
          if (!prev._period || cur > prev._period) {
            latestVote[vr.title] = { votes: Number(vr.votes) || 0, _period: cur } as any
          }
        }

        if (sData) setAllRows(sData.map((s: any) => {
          const vol = volMap[s.id]
          const cnt = vol?.count ?? 0
          const price = vol?.priceSum ?? null
          return {
            ...s, studio: null,
            mean_score: null, popularity: null, favourites: null,
            episodes: null, duration_min: null, format: null,
            season: null, season_year: null,
            volume_count: cnt,
            votes:        latestVote[s.title]?.votes ?? null,
            avg_price:    price && cnt > 0 ? Math.round(price / cnt) : null,
          }
        }))
      }
      setLoading(false)
    }
    load()
  }, [type])

  // Reset filters on type change
  useEffect(() => {
    setSearch(''); setFormatF('All'); setSeasonF('All'); setStatusF('All')
    setYearF('All'); setPublisherF('All'); setMinScore(0); setMinPop(0)
    setMaxPop(999999); setMinEps(0); setMinVols(0)
    const defaults: Partial<Record<ItemType, keyof Row>> = { anime: 'mean_score', manga: 'mean_score', novel: 'votes' }
    setSortKey(defaults[type]!); setSortDir('desc')
  }, [type])

  const availableYears = useMemo(() => {
    const s = new Set<number>()
    allRows.forEach(r => { if (r.season_year) s.add(r.season_year) })
    return ['All', ...Array.from(s).sort((a, b) => b - a).map(String)]
  }, [allRows])

  const availablePublishers = useMemo(() => {
    const s = new Set<string>()
    allRows.forEach(r => { if (r.publisher) s.add(r.publisher) })
    return ['All', ...Array.from(s).sort()]
  }, [allRows])

  // Filter + sort
  const filtered = useMemo(() => {
    let rows = allRows.filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusF    !== 'All' && (r.status   || '').toLowerCase() !== statusF.toLowerCase()) return false
      if (publisherF !== 'All' && r.publisher !== publisherF) return false
      if (type === 'anime') {
        if (formatF !== 'All' && (r.format || '').toUpperCase() !== formatF) return false
        if (seasonF !== 'All' && (r.season || '').toUpperCase().startsWith(seasonF)) return false
        if (yearF   !== 'All' && String(r.season_year) !== yearF) return false
        if (r.mean_score != null && r.mean_score < minScore) return false
        if (r.popularity != null && r.popularity < minPop)  return false
        if (r.popularity != null && r.popularity > maxPop)  return false
        if (minEps > 0 && (r.episodes ?? 0) < minEps)       return false
      }
      if (type === 'novel') {
        if (minVols > 0 && (r.volume_count ?? 0) < minVols) return false
      }
      return true
    })

    if (sortKey && sortDir) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av))
      })
    }
    return rows
  }, [allRows, search, sortKey, sortDir, formatF, seasonF, statusF, yearF, publisherF, minScore, minPop, maxPop, minEps, minVols, type])

  const cols = COLS[type]
  const numericKeys = cols.filter(c => c.numeric).map(c => c.key)
  const pctMaps = usePercentiles(filtered, numericKeys)

  function toggleSort(key: keyof Row) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : d === 'asc' ? null : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function SortIcon({ k }: { k: keyof Row }) {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 opacity-30" />
    if (sortDir === 'desc') return <ChevronDown className="w-3 h-3 text-primary-400" />
    if (sortDir === 'asc')  return <ChevronUp   className="w-3 h-3 text-primary-400" />
    return <ChevronsUpDown className="w-3 h-3 opacity-30" />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Index</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
              {loading ? 'Loading…' : `${filtered.length.toLocaleString()} results`}
            </p>
          </div>

          {/* Type tabs */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
            {(['anime', 'manga', 'novel'] as ItemType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="px-5 py-2 text-sm font-semibold capitalize transition-all"
                style={type === t
                  ? { background: '#6366f1', color: '#fff' }
                  : { background: 'var(--background-secondary)', color: 'var(--foreground-secondary)' }}
              >
                {t === 'anime' ? 'Anime' : t === 'manga' ? 'Manga' : 'Novel'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* ── Sidebar ── */}
          <div
            className={`flex-shrink-0 rounded-2xl overflow-hidden transition-all ${sidebarOpen ? 'w-64' : 'w-12'}`}
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}
          >
            {/* Toggle */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors"
              style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--foreground)' }}
            >
              <SlidersHorizontal className="w-4 h-4 flex-shrink-0 text-primary-400" />
              {sidebarOpen && 'Filters'}
            </button>

            {sidebarOpen && (
              <div className="p-4 space-y-5">

                {/* Search */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--foreground-muted)' }}>Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--foreground-muted)' }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Title…"
                      className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg outline-none"
                      style={sel}
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                        <X className="w-3 h-3" style={{ color: 'var(--foreground-muted)' }} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status */}
                <FilterSelect label="Status" value={statusF} onChange={setStatusF} options={STATUS_OPTIONS} />

                {/* Anime-specific */}
                {type === 'anime' && (<>
                  <FilterSelect label="Format" value={formatF} onChange={setFormatF} options={FORMAT_OPTIONS} />
                  <FilterSelect label="Season" value={seasonF} onChange={setSeasonF} options={SEASON_OPTIONS} />
                  <FilterSelect label="Year"   value={yearF}   onChange={setYearF}   options={availableYears} />

                  <SliderFilter
                    label="Min Score"
                    value={minScore} min={0} max={100} step={5}
                    onChange={setMinScore}
                    display={v => v === 0 ? 'Any' : `≥ ${v}`}
                  />
                  <SliderFilter
                    label="Min Episodes"
                    value={minEps} min={0} max={200} step={1}
                    onChange={setMinEps}
                    display={v => v === 0 ? 'Any' : `≥ ${v}`}
                  />
                </>)}

                {/* Manga-specific */}
                {type === 'manga' && (
                  <FilterSelect label="Publisher" value={publisherF} onChange={setPublisherF} options={availablePublishers.slice(0, 60)} />
                )}

                {/* Novel-specific */}
                {type === 'novel' && (<>
                  <FilterSelect label="Publisher" value={publisherF} onChange={setPublisherF} options={availablePublishers.slice(0, 60)} />
                  <SliderFilter
                    label="Min Volumes"
                    value={minVols} min={0} max={50} step={1}
                    onChange={setMinVols}
                    display={v => v === 0 ? 'Any' : `≥ ${v}`}
                  />
                </>)}

                {/* Reset */}
                <button
                  onClick={() => {
                    setSearch(''); setFormatF('All'); setSeasonF('All')
                    setStatusF('All'); setYearF('All'); setPublisherF('All')
                    setMinScore(0); setMinPop(0); setMaxPop(999999); setMinEps(0); setMinVols(0)
                  }}
                  className="w-full py-1.5 text-xs font-semibold rounded-lg transition-colors"
                  style={{ background: 'var(--background-secondary)', color: 'var(--foreground-secondary)', border: '1px solid var(--card-border)' }}
                >
                  Reset All
                </button>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div className="flex-1 min-w-0 rounded-2xl overflow-hidden" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                  <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Loading…</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <th className="text-left px-5 py-3 font-semibold sticky left-0 z-10 whitespace-nowrap" style={{ color: 'var(--foreground-muted)', background: 'var(--glass-bg)', minWidth: 220 }}>
                        TITLE
                      </th>
                      {cols.map(col => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-right whitespace-nowrap cursor-pointer select-none"
                          style={{ color: sortKey === col.key ? '#818cf8' : 'var(--foreground-muted)' }}
                          onClick={() => toggleSort(col.key)}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <SortIcon k={col.key} />
                            {col.short}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={cols.length + 1} className="text-center py-16 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                          No results match your filters
                        </td>
                      </tr>
                    ) : filtered.slice(0, 200).map((row, i) => (
                      <tr
                        key={row.id}
                        style={{ borderBottom: '1px solid var(--card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}
                      >
                        {/* Title cell */}
                        <td className="px-5 py-3 sticky left-0 z-10" style={{ background: i % 2 === 0 ? 'var(--glass-bg)' : 'var(--background-secondary)' }}>
                          <Link href={`/content/${row.id}`} className="hover:text-primary-400 transition-colors">
                            <p className="font-semibold truncate max-w-[200px]" style={{ color: 'var(--foreground)' }}>{row.title}</p>
                          </Link>
                          <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--foreground-muted)' }}>
                            {row.studio || row.publisher || row.item_type}
                          </p>
                        </td>

                        {/* Data cells */}
                        {cols.map(col => {
                          const val = row[col.key]
                          const sorted = pctMaps[col.key] ?? []
                          const pct  = col.numeric && val != null ? getPct(Number(val), sorted) : 50
                          const color = col.numeric && val != null
                            ? pctColor(pct, col.invert)
                            : 'var(--foreground-secondary)'
                          return (
                            <td key={col.key} className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap" style={{ color }}>
                              {fmtVal(col, val)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length > 200 && (
                  <p className="text-center py-3 text-xs" style={{ color: 'var(--foreground-muted)', borderTop: '1px solid var(--card-border)' }}>
                    Showing top 200 of {filtered.length.toLocaleString()} — use filters to narrow down
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--foreground-muted)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm rounded-lg px-3 py-1.5 outline-none"
        style={{ background: 'var(--background-secondary)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
      >
        {options.map(o => <option key={o} value={o}>{o === 'All' ? `All ${label}s` : o}</option>)}
      </select>
    </div>
  )
}

function SliderFilter({ label, value, min, max, step, onChange, display }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; display: (v: number) => string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-muted)' }}>{label}</label>
        <span className="text-xs font-bold" style={{ color: value === min ? 'var(--foreground-muted)' : '#818cf8' }}>{display(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary-500"
      />
    </div>
  )
}
