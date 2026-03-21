'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, X, ChevronDown, ChevronRight, Loader2, BookOpen, Tv, Book, Star, TrendingUp, Clock, ArrowRight } from 'lucide-react'
import supabase from '@/lib/supabaseClient'

// ── Types ─────────────────────────────────────────────────────────────────────
type ContentType = 'anime' | 'manga' | 'novel'

interface SeriesCard {
  id:        string | number
  title:     string
  cover_url: string | null
  score:     number | null
  status:    string | null
  type:      ContentType
  meta:      string | null  // studio / publisher / author
  year:      number | null
  genres:    string[]
  href:      string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  anime: { label: 'Anime',        color: '#6366f1', icon: Tv,       gradient: 'from-indigo-600 to-violet-600' },
  manga: { label: 'Manga',        color: '#ec4899', icon: Book,     gradient: 'from-pink-500 to-rose-500'     },
  novel: { label: 'Tiểu thuyết',  color: '#22c55e', icon: BookOpen, gradient: 'from-green-500 to-emerald-500' },
}

const STATUS_OPTS = ['all', 'ongoing', 'completed', 'cancelled', 'hiatus']
const FORMAT_OPTS = ['all', 'TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL']

const SORT_OPTS: Record<ContentType, { id: string; label: string }[]> = {
  anime: [
    { id: 'score_desc',   label: 'Điểm cao nhất' },
    { id: 'popular_desc', label: 'Phổ biến nhất' },
    { id: 'year_desc',    label: 'Mới nhất' },
    { id: 'title_asc',    label: 'Tên A–Z' },
  ],
  manga: [
    { id: 'rating_desc',  label: 'Điểm cao nhất' },
    { id: 'follows_desc', label: 'Nhiều follow nhất' },
    { id: 'year_desc',    label: 'Mới nhất' },
    { id: 'title_asc',    label: 'Tên A–Z' },
  ],
  novel: [
    { id: 'votes_desc',   label: 'Nhiều votes nhất' },
    { id: 'vols_desc',    label: 'Nhiều tập nhất' },
    { id: 'title_asc',    label: 'Tên A–Z' },
  ],
}

const PAGE_SIZE = 24

// ── Helpers ───────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, ms = 300): T {
  const [dv, setDv] = useState(value)
  useEffect(() => { const t = setTimeout(() => setDv(value), ms); return () => clearTimeout(t) }, [value, ms])
  return dv
}

function statusLabel(s: string | null) {
  if (!s) return ''
  const map: Record<string, string> = { ongoing: 'Đang tiếp', completed: 'Hoàn thành', cancelled: 'Đã hủy', hiatus: 'Tạm dừng', publishing: 'Đang xuất bản', finished: 'Hoàn thành' }
  return map[s.toLowerCase()] || s
}

function statusColor(s: string | null) {
  const sl = (s || '').toLowerCase()
  if (sl === 'ongoing' || sl === 'publishing') return '#22c55e'
  if (sl === 'completed' || sl === 'finished') return '#6366f1'
  if (sl === 'cancelled') return '#f87171'
  return '#94a3b8'
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Glowing card inspired by Aceternity UI
function GlowCard({ children, color, className = '' }: { children: React.ReactNode; color: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0, opacity: 0 })

  const handleMouse = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, opacity: 1 })
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={() => setPos(p => ({ ...p, opacity: 0 }))}
      className={`relative group overflow-hidden rounded-xl transition-transform duration-200 hover:scale-[1.02] hover:-translate-y-0.5 ${className}`}
      style={{ border: '1px solid var(--card-border)' }}
    >
      {/* Spotlight glow */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 rounded-xl"
        style={{
          opacity: pos.opacity,
          background: `radial-gradient(200px circle at ${pos.x}px ${pos.y}px, ${color}18, transparent 70%)`,
        }}
      />
      {/* Glow border */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl transition-opacity duration-300"
        style={{
          opacity: pos.opacity * 0.6,
          boxShadow: `inset 0 0 0 1px ${color}50`,
        }}
      />
      {children}
    </div>
  )
}

// Skeleton card
function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse" style={{ border: '1px solid var(--card-border)', background: 'var(--glass-bg)' }}>
      <div className="aspect-[2/3] w-full" style={{ background: 'var(--background-secondary)' }} />
      <div className="p-3 space-y-2">
        <div className="h-3 rounded-full w-4/5" style={{ background: 'var(--background-secondary)' }} />
        <div className="h-2.5 rounded-full w-3/5" style={{ background: 'var(--background-secondary)' }} />
      </div>
    </div>
  )
}

// Series card
function SeriesCardItem({ card, color }: { card: SeriesCard; color: string }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <GlowCard color={color}>
      <Link href={card.href} className="block" style={{ background: 'var(--glass-bg)' }}>
        {/* Cover */}
        <div className="relative aspect-[2/3] overflow-hidden">
          {card.cover_url && !imgErr ? (
            <img src={card.cover_url} alt={card.title} className="w-full h-full object-cover block transition-transform duration-300 group-hover:scale-105" onError={() => setImgErr(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }}>
              <BookOpen className="w-10 h-10 opacity-30" style={{ color }} />
            </div>
          )}
          {/* Score badge */}
          {card.score != null && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold"
              style={{ background: 'rgba(0,0,0,0.75)', color: '#fbbf24', backdropFilter: 'blur(4px)' }}>
              ★ {card.score}
            </div>
          )}
          {/* Status pill */}
          {card.status && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
              style={{ background: `${statusColor(card.status)}cc`, backdropFilter: 'blur(4px)' }}>
              {statusLabel(card.status)}
            </div>
          )}
        </div>
        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-semibold line-clamp-2 leading-snug mb-1" style={{ color: 'var(--foreground)' }}>{card.title}</p>
          {card.meta && <p className="text-xs truncate" style={{ color: 'var(--foreground-muted)' }}>{card.meta}</p>}
          {card.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {card.genres.slice(0, 2).map(g => (
                <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{ background: `${color}18`, color }}>{g}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </GlowCard>
  )
}

// Mini carousel card (discovery mode)
function CarouselCard({ card, color }: { card: SeriesCard; color: string }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <Link href={card.href} className="flex-shrink-0 w-32 sm:w-36 group">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 transition-transform duration-200 group-hover:scale-[1.03]"
        style={{ border: `1px solid ${color}33` }}>
        {card.cover_url && !imgErr ? (
          <img src={card.cover_url} alt={card.title} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }} />
        )}
        {card.score != null && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: 'rgba(0,0,0,0.75)', color: '#fbbf24' }}>★ {card.score}</div>
        )}
      </div>
      <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: 'var(--foreground)' }}>{card.title}</p>
    </Link>
  )
}

// Horizontal scroll carousel
function Carousel({ title, icon: Icon, items, loading, color }: {
  title: string; icon: any; items: SeriesCard[]; loading: boolean; color: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-4 sm:px-0">
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
        <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{title}</h3>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 px-4 sm:px-0 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-32 sm:w-36 animate-pulse">
            <div className="aspect-[2/3] rounded-xl mb-2" style={{ background: 'var(--background-secondary)' }} />
            <div className="h-2.5 rounded w-4/5" style={{ background: 'var(--background-secondary)' }} />
          </div>
        )) : items.map(card => <CarouselCard key={card.id} card={card} color={color} />)}
      </div>
    </div>
  )
}

// Filter popover
function FilterPopover({ type, status, setStatus, format, setFormat, genre, setGenre,
  genreOptions, activeCount, onClear, color }: any) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const FilterRow = ({ label, value, options, onChange }: any) => (
    <div className="mb-4 last:mb-0">
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--foreground-muted)' }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o: string) => (
          <button key={o} onClick={() => onChange(o)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            style={value === o
              ? { background: color, color: '#fff' }
              : { background: 'var(--background-secondary)', color: 'var(--foreground-secondary)', border: '1px solid var(--card-border)' }}>
            {o === 'all' ? 'Tất cả' : o}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
        style={activeCount > 0
          ? { background: `${color}20`, color, border: `1px solid ${color}55` }
          : { background: 'var(--background-secondary)', color: 'var(--foreground-secondary)', border: '1px solid var(--card-border)' }}>
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Bộ lọc
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white"
            style={{ background: color }}>{activeCount}</span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 rounded-2xl p-4 min-w-[280px] shadow-2xl"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--foreground)' }}>Bộ lọc nâng cao</span>
            {activeCount > 0 && (
              <button onClick={onClear} className="text-xs font-semibold text-red-400 hover:text-red-300">✕ Xóa tất cả</button>
            )}
          </div>
          <FilterRow label="Trạng thái" value={status} options={STATUS_OPTS} onChange={setStatus} />
          {type === 'anime' && <FilterRow label="Format" value={format} options={FORMAT_OPTS} onChange={setFormat} />}
          {genreOptions.length > 1 && <FilterRow label="Thể loại" value={genre} options={['all', ...genreOptions.slice(0, 12)]} onChange={setGenre} />}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BrowsePage() {
  const [type,        setType]        = useState<ContentType>('anime')
  const [browseMode,  setBrowseMode]  = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [sort,        setSort]        = useState('score_desc')
  const [status,      setStatus]      = useState('all')
  const [format,      setFormat]      = useState('all')
  const [genre,       setGenre]       = useState('all')
  const [page,        setPage]        = useState(0)

  // Data
  const [cards,       setCards]       = useState<SeriesCard[]>([])
  const [hasMore,     setHasMore]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [popular,     setPopular]     = useState<SeriesCard[]>([])
  const [recent,      setRecent]      = useState<SeriesCard[]>([])
  const [discLoading, setDiscLoading] = useState(true)
  const [genreOptions,setGenreOptions]= useState<string[]>([])

  const search = useDebounce(searchInput, 300)
  const color  = TYPE_CONFIG[type].color

  // Switch type → reset everything
  useEffect(() => {
    setSort(SORT_OPTS[type][0].id)
    setStatus('all'); setFormat('all'); setGenre('all')
    setPage(0); setCards([]); setBrowseMode(false); setSearchInput('')
  }, [type])

  // Discovery data
  useEffect(() => {
    async function loadDiscovery() {
      setDiscLoading(true)
      try {
        if (type === 'anime') {
          const [{ data: pop }, { data: rec }] = await Promise.all([
            supabase.from('series').select('id, title, cover_url, status, anime_meta(mean_score, popularity, format, season_year), studio')
              .eq('item_type', 'anime').order('anime_meta(popularity)', { ascending: false }).limit(12),
            supabase.from('series').select('id, title, cover_url, status, anime_meta(mean_score, season_year), studio')
              .eq('item_type', 'anime').order('anime_meta(season_year)', { ascending: false }).limit(12),
          ])
          setPopular(toAnimeCards(pop || []))
          setRecent(toAnimeCards(rec || []))
        } else if (type === 'manga') {
          const [{ data: pop }, { data: rec }] = await Promise.all([
            supabase.from('manga').select('id, title_en, title_ja_ro, cover_url, rating, follows, status, genres, author').order('follows', { ascending: false }).not('cover_url', 'is', null).limit(12),
            supabase.from('manga').select('id, title_en, title_ja_ro, cover_url, rating, follows, status, genres, author').order('year', { ascending: false }).not('cover_url', 'is', null).limit(12),
          ])
          setPopular(toMangaCards(pop || []))
          setRecent(toMangaCards(rec || []))
          // Extract genres for filter
          const allGenres = new Set<string>()
          ;[...(pop || []), ...(rec || [])].forEach((m: any) => { if (Array.isArray(m.genres)) m.genres.forEach((g: string) => allGenres.add(g)) })
          setGenreOptions(Array.from(allGenres).sort().slice(0, 20))
        } else {
          const { data: nd } = await supabase.from('novel_dashboard').select('series_id, title, latest_votes, cover_url').order('latest_votes', { ascending: false }).limit(12)
          const novelCards = (nd || []).map((n: any): SeriesCard => ({
            id: n.series_id, title: n.title, cover_url: n.cover_url,
            score: n.latest_votes ?? null, status: null, type: 'novel',
            meta: null, year: null, genres: [], href: `/content/${n.series_id}`,
          }))
          setPopular(novelCards)
          setRecent(novelCards.slice().reverse().slice(0, 12))
        }
      } finally {
        setDiscLoading(false)
      }
    }
    loadDiscovery()
  }, [type])

  // Browse fetch
  const fetchCards = useCallback(async (reset = true) => {
    const isFirst = reset
    isFirst ? setLoading(true) : setLoadingMore(true)
    const offset = reset ? 0 : page * PAGE_SIZE

    try {
      let results: SeriesCard[] = []
      let more = false

      if (type === 'anime') {
        let q = supabase.from('series')
          .select('id, title, cover_url, status, anime_meta(mean_score, popularity, format, season_year), studio')
          .eq('item_type', 'anime')
        if (search)             q = q.ilike('title', `%${search}%`)
        if (status !== 'all')   q = q.ilike('status', status)
        if (format !== 'all')   q = q.eq('anime_meta.format', format)
        // sort
        if (sort === 'score_desc')   q = q.order('anime_meta(mean_score)', { ascending: false })
        else if (sort === 'popular_desc') q = q.order('anime_meta(popularity)', { ascending: false })
        else if (sort === 'year_desc')    q = q.order('anime_meta(season_year)', { ascending: false })
        else q = q.order('title', { ascending: true })
        q = q.range(offset, offset + PAGE_SIZE)
        const { data } = await q
        results = toAnimeCards(data || [])
        more = results.length === PAGE_SIZE

      } else if (type === 'manga') {
        let q = supabase.from('manga').select('id, title_en, title_ja_ro, cover_url, rating, follows, status, genres, author, year')
        if (search)           q = q.or(`title_en.ilike.%${search}%,title_ja_ro.ilike.%${search}%`)
        if (status !== 'all') q = q.ilike('status', status)
        if (genre  !== 'all') q = q.contains('genres', [genre])
        if (sort === 'rating_desc')  q = q.order('rating',  { ascending: false })
        else if (sort === 'follows_desc') q = q.order('follows', { ascending: false })
        else if (sort === 'year_desc')    q = q.order('year',    { ascending: false })
        else q = q.order('title_en', { ascending: true, nullsFirst: false })
        q = q.range(offset, offset + PAGE_SIZE)
        const { data } = await q
        results = toMangaCards(data || [])
        more = results.length === PAGE_SIZE

      } else {
        // Novel — from series table, sorted by votes from novel_dashboard
        const { data: nd } = await supabase.from('novel_dashboard')
          .select('series_id, title, latest_votes, cover_url')
          .order('latest_votes', { ascending: false })
          .range(offset, offset + PAGE_SIZE)
        results = (nd || []).map((n: any): SeriesCard => ({
          id: n.series_id, title: n.title, cover_url: n.cover_url,
          score: n.latest_votes ?? null, status: null, type: 'novel',
          meta: null, year: null, genres: [], href: `/content/${n.series_id}`,
        }))
        more = results.length === PAGE_SIZE
      }

      if (reset) { setCards(results); setPage(1) }
      else       { setCards(prev => [...prev, ...results]); setPage(p => p + 1) }
      setHasMore(more)
    } finally {
      isFirst ? setLoading(false) : setLoadingMore(false)
    }
  }, [type, search, status, format, genre, sort, page])

  // Trigger fetch when browse mode active or filters/search change
  useEffect(() => {
    if (!browseMode && !search) return
    fetchCards(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, search, status, format, genre, sort, browseMode])

  const activeFilters = [status !== 'all', format !== 'all', genre !== 'all'].filter(Boolean).length

  function toAnimeCards(rows: any[]): SeriesCard[] {
    return rows.map(s => ({
      id: s.id, title: s.title, cover_url: s.cover_url,
      score: s.anime_meta?.mean_score ?? null,
      status: s.status, type: 'anime' as ContentType,
      meta: s.studio, year: s.anime_meta?.season_year ?? null,
      genres: [], href: `/content/${s.id}`,
    }))
  }

  function toMangaCards(rows: any[]): SeriesCard[] {
    return rows.map(m => ({
      id: m.id, title: m.title_en || m.title_ja_ro || m.id,
      cover_url: proxyImg(m.cover_url),
      score: m.rating ? Number(m.rating) : null,
      status: m.status, type: 'manga' as ContentType,
      meta: m.author, year: m.year ?? null,
      genres: Array.isArray(m.genres) ? m.genres : [],
      href: '#',
    }))
  }

  function proxyImg(url: string | null) {
    if (!url) return null
    try {
      const h = new URL(url).hostname
      if (['uploads.mangadex.org', 'cmdxd98ubx3fv.cloudfront.net'].some(d => h.endsWith(d)))
        return `/api/image-proxy?url=${encodeURIComponent(url)}`
    } catch {}
    return url
  }

  const isBrowsing = browseMode || !!search

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>

      {/* ── Hero / Header ── */}
      <div className="relative overflow-hidden" style={{ background: 'var(--background-secondary)', borderBottom: '1px solid var(--card-border)' }}>
        {/* Subtle gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-20" style={{ background: TYPE_CONFIG[type].color }} />
          <div className="absolute -bottom-20 right-0 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: TYPE_CONFIG[type].color }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-black mb-1">
              <span style={{ color: 'var(--foreground)' }}>Khám phá </span>
              <span style={{
                background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {TYPE_CONFIG[type].label}
              </span>
            </h1>
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Tìm kiếm và khám phá {TYPE_CONFIG[type].label.toLowerCase()} trong cơ sở dữ liệu LiDex
            </p>
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 mb-6">
            {(Object.keys(TYPE_CONFIG) as ContentType[]).map(t => {
              const cfg = TYPE_CONFIG[t]
              const Icon = cfg.icon
              const active = t === type
              return (
                <button key={t} onClick={() => setType(t)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={active
                    ? { background: cfg.color, color: '#fff', boxShadow: `0 4px 16px ${cfg.color}44` }
                    : { background: 'var(--glass-bg)', color: 'var(--foreground-secondary)', border: '1px solid var(--card-border)' }}>
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {/* Search bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
            <input
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); if (e.target.value) setBrowseMode(true) }}
              placeholder={`Tìm ${TYPE_CONFIG[type].label.toLowerCase()}…`}
              className="w-full pl-11 pr-10 py-3 rounded-2xl text-sm outline-none transition-all"
              style={{
                background:  'var(--glass-bg)',
                color:       'var(--foreground)',
                border:      `1px solid var(--card-border)`,
              }}
              onFocus={e => { e.target.style.borderColor = `${color}70`; e.target.style.boxShadow = `0 0 0 3px ${color}18` }}
              onBlur={e  => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none' }}
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-sm" style={{ color: 'var(--foreground-muted)', background: 'var(--background-secondary)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* ── Discovery mode ── */}
        {!isBrowsing && (
          <div>
            <Carousel title="Phổ biến nhất" icon={TrendingUp} items={popular} loading={discLoading} color={color} />
            <Carousel title="Mới nhất"       icon={Clock}      items={recent}  loading={discLoading} color={color} />

            {/* Browse all CTA */}
            <div className="text-center mt-6">
              <button
                onClick={() => setBrowseMode(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)`, boxShadow: `0 8px 24px ${color}44` }}
              >
                Xem tất cả {TYPE_CONFIG[type].label}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Browse mode ── */}
        {isBrowsing && (
          <div>
            {/* Filter + sort bar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <FilterPopover
                type={type} status={status} setStatus={setStatus}
                format={format} setFormat={setFormat}
                genre={genre} setGenre={setGenre}
                genreOptions={genreOptions} activeCount={activeFilters}
                onClear={() => { setStatus('all'); setFormat('all'); setGenre('all') }}
                color={color}
              />

              {/* Sort */}
              <select
                value={sort} onChange={e => setSort(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm font-semibold outline-none cursor-pointer"
                style={{ background: 'var(--background-secondary)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
              >
                {SORT_OPTS[type].map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>

              {/* Result count / back */}
              <div className="ml-auto flex items-center gap-3">
                {!loading && (
                  <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                    {cards.length}{hasMore ? '+' : ''} kết quả
                  </span>
                )}
                {!searchInput && (
                  <button onClick={() => setBrowseMode(false)} className="text-xs font-semibold flex items-center gap-1 hover:text-primary-400 transition-colors" style={{ color: 'var(--foreground-secondary)' }}>
                    <X className="w-3 h-3" /> Đóng
                  </button>
                )}
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilters > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {status !== 'all' && <FilterChip label={status} onRemove={() => setStatus('all')} color={color} />}
                {format !== 'all' && <FilterChip label={format} onRemove={() => setFormat('all')} color={color} />}
                {genre  !== 'all' && <FilterChip label={genre}  onRemove={() => setGenre('all')}  color={color} />}
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : cards.length === 0 ? (
              <div className="flex flex-col items-center py-24 gap-4">
                <BookOpen className="w-12 h-12 opacity-20" style={{ color }} />
                <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Không tìm thấy kết quả</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {cards.map(card => <SeriesCardItem key={card.id} card={card} color={color} />)}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => fetchCards(false)}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}44` }}
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                      Tải thêm
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterChip({ label, onRemove, color }: { label: string; onRemove: () => void; color: string }) {
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}>
      {label}
      <button onClick={onRemove} className="hover:opacity-70"><X className="w-3 h-3" /></button>
    </span>
  )
}
