'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { BookOpen, Tv, Book, RefreshCw, ArrowRight, Loader2 } from 'lucide-react'
import { getTopRatedSeries } from '../../lib/supabase'
import supabase from '@/lib/supabaseClient'
import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SiteStats { totalSeries: number; totalAnime: number; totalManga: number; totalNovel: number }
interface CarouselItem { id: string | number; title: string; cover_url: string | null; score: number | null; href: string }
type CarouselSection = 'anime' | 'manga' | 'novel'

// ── Config ────────────────────────────────────────────────────────────────────
const SECTION_CONFIG: Record<CarouselSection, { label: string; labelVI: string; color: string; href: string }> = {
  anime: { label: 'Anime',       labelVI: 'Anime',       color: '#6366f1', href: '/browse' },
  manga: { label: 'Manga',       labelVI: 'Manga',       color: '#ec4899', href: '/browse' },
  novel: { label: 'Novel',       labelVI: 'Tiểu thuyết', color: '#22c55e', href: '/browse' },
}
const ROTATE_INTERVAL = 6000

// Proxy ALL external images to avoid CORS / hotlink issues
function proxyImg(url: string | null): string | null {
  if (!url) return null
  try {
    const h = new URL(url).hostname
    if (!h.includes('supabase') && !h.includes('localhost') && !url.startsWith('/')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`
    }
  } catch {}
  return url
}

// Fetch latest non-special volume cover for each series id
async function fetchLatestVolCovers(ids: (string | number)[]): Promise<Record<string | number, string | null>> {
  if (!ids.length) return {}
  const { data } = await supabase
    .from('volumes')
    .select('series_id, cover_url, volume_number')
    .in('series_id', ids)
    .eq('is_special', false)
    .not('cover_url', 'is', null)
    .order('volume_number', { ascending: false })
  if (!data) return {}
  const map: Record<string | number, string | null> = {}
  for (const row of data) {
    if (map[row.series_id] === undefined) {
      map[row.series_id] = proxyImg(row.cover_url)
    }
  }
  return map
}

// ── Skeleton components ───────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--background-secondary)' }} />
        <div className="h-3 rounded-full w-20" style={{ background: 'var(--background-secondary)' }} />
      </div>
      <div className="h-8 rounded-full w-24" style={{ background: 'var(--background-secondary)' }} />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="relative">
      <div className="ml-auto rounded-xl overflow-hidden animate-pulse" style={{ width: '78%' }}>
        <div className="aspect-[2/3]" style={{ background: 'var(--background-secondary)' }} />
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl p-4 sm:p-5 group transition-all duration-200 hover:scale-[1.02]"
      style={{ background: 'var(--glass-bg)', border: `1px solid ${color}25` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
        </div>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      </div>
      <p className="text-2xl sm:text-3xl font-black leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{label}</p>
    </div>
  )
}

// ── Top Card ──────────────────────────────────────────────────────────────────
function TopCard({ item, rank, accentColor, scoreLabel }: {
  item: CarouselItem; rank: number; accentColor: string; scoreLabel?: string
}) {
  const [imgErr, setImgErr] = useState(false)

  const fmtScore = (s: number | null) => {
    if (s == null) return null
    if (scoreLabel === 'votes') return s >= 1000 ? `${(s / 1000).toFixed(1)}K` : String(s)
    return String(s)
  }
  const scoreText = fmtScore(item.score)

  const card = (
    <div className="relative group cursor-pointer">
      {/* Rank number */}
      <span className="absolute select-none pointer-events-none font-black z-0"
        style={{
          fontSize: 'clamp(48px, 8vw, 100px)', color: 'transparent',
          WebkitTextStroke: `2px ${accentColor}44`, bottom: '-4px', left: '0',
          transform: 'translateX(-30%)', lineHeight: 1,
          fontFamily: '"Arial Black", Impact, sans-serif', letterSpacing: '-2px',
        }}>
        {rank}
      </span>

      {/* Cover */}
      <div className="relative z-10 ml-auto rounded-xl overflow-hidden shadow-xl transition-all duration-200 group-hover:scale-[1.04] group-hover:shadow-2xl"
        style={{ width: '78%', border: `2px solid ${accentColor}33` }}>
        {item.cover_url && !imgErr ? (
          <img src={item.cover_url} alt={item.title}
            className="w-full aspect-[2/3] object-cover block"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full aspect-[2/3] flex items-center justify-center p-3"
            style={{ background: 'var(--background-secondary)' }}>
            <p className="text-xs font-semibold text-center line-clamp-4" style={{ color: 'var(--foreground-secondary)' }}>{item.title}</p>
          </div>
        )}

        {scoreText && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.78)', color: '#fbbf24', backdropFilter: 'blur(4px)' }}>
            ★ {scoreText}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 45%, transparent)' }}>
          <p className="text-white text-xs font-semibold px-2 pb-2 line-clamp-2 w-full">{item.title}</p>
        </div>

        {/* Accent glow on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 2px ${accentColor}88` }} />
      </div>
    </div>
  )

  return item.href !== '#' ? <Link href={item.href}>{card}</Link> : <div>{card}</div>
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { locale } = useLocale()
  const vi = locale === 'vi'

  const [stats,         setStats]         = useState<SiteStats | null>(null)
  const [statsLoading,  setStatsLoading]  = useState(true)
  const [carouselData,  setCarouselData]  = useState<Record<CarouselSection, CarouselItem[]>>({ anime: [], manga: [], novel: [] })
  const [carouselReady, setCarouselReady] = useState(false)
  const [activeSection, setActiveSection] = useState<CarouselSection>('anime')
  const [transitioning, setTransitioning] = useState(false)
  const [autoRotate,    setAutoRotate]    = useState(true)

  const sections: CarouselSection[] = ['anime', 'manga', 'novel']

  useEffect(() => {
    async function load() {
      try {
        const [
          topAnimeData,
          { count: animeCount },
          { count: novelCount },
          { count: mangaCount },
          mangaCarouselData,
          novelTableData,
        ] = await Promise.all([
          getTopRatedSeries({ limit: 10 }),
          supabase.from('series').select('anime_meta!inner(season_year)', { count: 'exact', head: true }).eq('item_type', 'anime').eq('anime_meta.season_year', 2026).not('genres', 'cs', '{"Hentai"}'),
          supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'novel').not('genres', 'cs', '{"Hentai"}'),
          supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'manga').not('genres', 'cs', '{"Hentai"}'),
          supabase.from('series').select('id, title, cover_url')
            .eq('item_type', 'manga').not('cover_url', 'is', null).not('genres', 'cs', '{"Hentai"}')
            .order('updated_at', { ascending: false }).limit(10),
          supabase.from('series').select('id, title, cover_url')
            .eq('item_type', 'novel').not('genres', 'cs', '{"Hentai"}')
            .order('updated_at', { ascending: false }).limit(10),
        ])

        const anime = animeCount ?? 0
        const novel = novelCount ?? 0
        const manga = mangaCount ?? 0
        setStats({ totalAnime: anime, totalNovel: novel, totalManga: manga, totalSeries: anime + novel + manga })
        setStatsLoading(false)

        setCarouselData({
          anime: (topAnimeData.data || []).map((s: any) => ({ id: s.id, title: s.title, cover_url: s.cover_url, score: s.anime_mean_score, href: `/content/${s.id}` })),
          manga: [], // will be filled below
          novel: [], // will be filled below
        })

        // Fetch latest volume covers for manga and novel
        const mangaRows = (mangaCarouselData.data) || []
        const novelRows = (novelTableData as any)?.data || novelTableData || []
        const [mangaVolCovers, novelVolCovers] = await Promise.all([
          fetchLatestVolCovers(mangaRows.map((m: any) => m.id)),
          fetchLatestVolCovers(novelRows.map((n: any) => n.id)),
        ])

        setCarouselData(prev => ({
          ...prev,
          manga: mangaRows.map((m: any) => ({
            id: m.id, title: m.title,
            cover_url: mangaVolCovers[m.id] !== undefined ? mangaVolCovers[m.id] : proxyImg(m.cover_url),
            score: null, href: `/content/${m.id}`
          })),
          novel: novelRows.map((n: any) => ({
            id: n.id, title: n.title,
            cover_url: novelVolCovers[n.id] !== undefined ? novelVolCovers[n.id] : proxyImg(n.cover_url),
            score: null, href: `/content/${n.id}`
          })),
        }))
        setCarouselReady(true)
      } catch (e) {
        console.error(e)
        setStatsLoading(false)
      }
    }
    load()
  }, [])

  const goToSection = useCallback((section: CarouselSection) => {
    if (section === activeSection) return
    setTransitioning(true)
    setTimeout(() => { setActiveSection(section); setTransitioning(false) }, 220)
  }, [activeSection])

  useEffect(() => {
    if (!autoRotate) return
    const t = setInterval(() => {
      const next = sections[(sections.indexOf(activeSection) + 1) % sections.length]
      goToSection(next)
    }, ROTATE_INTERVAL)
    return () => clearInterval(t)
  }, [autoRotate, activeSection, goToSection])

  const items = carouselData[activeSection]
  const color = SECTION_CONFIG[activeSection].color

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
              {vi ? 'Tổng quan nội dung và hoạt động cộng đồng' : 'Content overview and community activity'}
            </p>
          </div>
          <button onClick={() => window.location.reload()}
            className="p-2 rounded-xl transition-all hover:scale-110"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}
            title="Refresh">
            <RefreshCw className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-12">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCard icon={BookOpen} value={stats?.totalSeries?.toLocaleString() || '0'} label={vi ? 'Tổng số tựa'    : 'Total Series'}   color="#6366f1" />
              <StatCard icon={Tv}       value={stats?.totalAnime?.toLocaleString()  || '0'} label={vi ? 'Anime'          : 'Anime Titles'}   color="#818cf8" />
              <StatCard icon={Book}     value={stats?.totalManga?.toLocaleString()  || '0'} label={vi ? 'Manga'          : 'Manga Series'}   color="#ec4899" />
              <StatCard icon={BookOpen} value={(stats as any)?.totalNovel?.toLocaleString() || '0'} label={vi ? 'Tiểu thuyết' : 'Light Novels'} color="#22c55e" />
            </>
          )}
        </div>

        {/* ── Top 10 Carousel ── */}
        <div>
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">

            {/* Left: title */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--foreground)' }}>Top</span>
              <span className="text-2xl sm:text-3xl font-black transition-colors duration-300" style={{ color }}>10</span>
              <span className="text-base sm:text-lg font-bold ml-1 transition-colors duration-300" style={{ color }}>
                {vi ? SECTION_CONFIG[activeSection].labelVI : SECTION_CONFIG[activeSection].label}
              </span>
            </div>

            {/* Right: section switcher + browse link */}
            <div className="flex items-center gap-2">
              {/* Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-full" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
                {sections.map(s => (
                  <button key={s}
                    onClick={() => { setAutoRotate(false); goToSection(s) }}
                    className="px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap"
                    style={activeSection === s
                      ? { background: SECTION_CONFIG[s].color, color: '#fff', boxShadow: `0 2px 8px ${SECTION_CONFIG[s].color}44` }
                      : { color: 'var(--foreground-secondary)' }}>
                    {vi ? SECTION_CONFIG[s].labelVI : SECTION_CONFIG[s].label}
                  </button>
                ))}
              </div>

              {/* Auto-rotate progress dots */}
              {autoRotate && (
                <div className="hidden sm:flex gap-1">
                  {sections.map(s => (
                    <div key={s} className="h-0.5 rounded-full transition-all duration-300"
                      style={{ width: activeSection === s ? 20 : 6, background: activeSection === s ? SECTION_CONFIG[s].color : 'var(--card-border)' }} />
                  ))}
                </div>
              )}

              {/* Browse all link */}
              <Link href="/browse"
                className="hidden sm:flex items-center gap-1 text-xs font-semibold transition-all hover:gap-2"
                style={{ color: 'var(--foreground-muted)' }}>
                {vi ? 'Xem tất cả' : 'View all'}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Cards */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-2 sm:gap-x-4 gap-y-8 sm:gap-y-10"
            style={{ opacity: transitioning ? 0 : 1, transition: 'opacity 0.22s ease' }}
          >
            {!carouselReady ? (
              Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)
            ) : items.length === 0 ? (
              <div className="col-span-5 flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--foreground-muted)' }} />
              </div>
            ) : items.map((item, i) => (
              <TopCard key={item.id} item={item} rank={i + 1}
                accentColor={color}
                scoreLabel={activeSection === 'novel' ? 'votes' : undefined} />
            ))}
          </div>

          {/* Mobile: browse all */}
          <div className="flex justify-center mt-8 sm:hidden">
            <Link href="/browse"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
              {vi ? 'Xem tất cả' : 'View all'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
