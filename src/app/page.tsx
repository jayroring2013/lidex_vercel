'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, BarChart2, Flame, GitCompareArrows } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { useLocale } from '@/contexts/LocaleContext'

interface Cover { id: number; title: string; cover_url: string | null }
interface TypeCounts { anime: number; manga: number; novel: number }

// ── Safe image ────────────────────────────────────────────────────────────────
function SafeImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false)
  if (err) return <div className={className} style={{ background: 'rgba(99,102,241,0.12)' }} />
  return <img src={src} alt={alt} className={className ?? 'w-full h-full object-cover block'} onError={() => setErr(true)} />
}

// ── Scrolling cover column ────────────────────────────────────────────────────
function CoverColumn({ covers, speed, offset, delay }: {
  covers: Cover[]; speed: number; offset: number; delay: number
}) {
  const doubled = [...covers, ...covers]
  return (
    <div className="flex flex-col gap-2 w-full" style={{ marginTop: offset }}>
      <div style={{ animation: `scrollUp ${speed}s linear infinite`, animationDelay: `${delay}s` }}
        className="flex flex-col gap-2">
        {doubled.map((c, i) => (
          <div key={i} className="rounded-lg overflow-hidden flex-shrink-0"
            style={{ aspectRatio: '2/3', border: '1px solid rgba(255,255,255,0.05)' }}>
            {c.cover_url
              ? <SafeImg src={c.cover_url} alt={c.title} />
              : <div className="w-full h-full" style={{ background: 'rgba(99,102,241,0.1)' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Trending card with cycling background covers ───────────────────────────────
function TrendingCard({ items, vi }: { items: Cover[]; vi: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (items.length < 2) return
    timerRef.current = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setActiveIdx(prev => (prev + 1) % items.length)
        setFading(false)
      }, 400)
    }, 3000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [items.length])

  const active = items[activeIdx]

  return (
    <div className="relative rounded-2xl overflow-hidden w-full h-full"
      style={{ background: '#7c2d12', boxShadow: '0 8px 32px rgba(249,115,22,0.3)' }}>

      {/* Full-bleed cover — clearly visible, no blur, no desaturation */}
      {active?.cover_url && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: fading ? 0 : 1 }}
        >
          <img
            src={active.cover_url}
            alt=""
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}

      {/* Subtle dark scrim only at top and bottom so text sits cleanly */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 45%, transparent 40%, rgba(0,0,0,0.72) 100%)' }} />

      {/* Content — eyebrow at top, title + dots at bottom */}
      <div className="absolute inset-0 flex flex-col justify-between p-5">
        {/* Top: small eyebrow label */}
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-orange-300 flex-shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em' }}>
            {vi ? 'Đang thịnh hành' : 'Trending Now'}
          </p>
        </div>

        {/* Bottom: big title + dots + link — mirrors the other cards */}
        <div>
          <p
            className="text-base font-bold text-white leading-snug mb-2 transition-opacity duration-400"
            style={{ opacity: fading ? 0 : 1 }}
          >
            {active?.title ?? '…'}
          </p>

          {/* Dot indicators */}
          <div className="flex gap-1.5 mb-3">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setActiveIdx(i); setFading(false) }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activeIdx ? 18 : 6,
                  height: 6,
                  background: i === activeIdx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>

          <Link href="/browse"
            className="group inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'rgba(255,255,255,0.75)' }}>
            {vi ? 'Xem tất cả' : 'View all'}
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ color, title, cta, href }: {
  color: string; title: string; cta: string; href: string
}) {
  return (
    <Link href={href}
      className="group relative flex flex-col justify-end rounded-2xl overflow-hidden w-full h-full transition-all duration-200 hover:scale-[1.02] hover:-translate-y-1"
      style={{ background: color, boxShadow: `0 6px 24px ${color}55` }}>
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, transparent 60%)' }} />
      <div className="relative p-5">
        <p className="text-base font-bold text-white leading-tight">{title}</p>
        <p className="text-xs mt-1.5 font-semibold flex items-center gap-1"
          style={{ color: 'rgba(255,255,255,0.7)' }}>
          {cta}
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </p>
      </div>
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { locale } = useLocale()
  const vi = locale === 'vi'

  const [covers,     setCovers]     = useState<Cover[]>([])
  const [trending,   setTrending]   = useState<Cover[]>([])
  const [typeCounts, setTypeCounts] = useState<TypeCounts | null>(null)

  useEffect(() => {
    // Cover wall
    supabase
      .from('series')
      .select('id, title, cover_url, item_type')
      .in('item_type', ['anime', 'manga', 'novel'])
      .not('cover_url', 'is', null)
      .not('genres', 'cs', '{"Hentai"}')
      .limit(60)
      .then(({ data, error }) => {
        const source = error ? null : data
        const load = (d: any[]) => {
          const shuffled = [...d].sort(() => Math.random() - 0.5)
          setCovers(shuffled.map((s: any) => ({ id: s.id, title: s.title, cover_url: s.cover_url })))
        }
        if (source && source.length > 0) { load(source); return }
        supabase.from('series').select('id, title, cover_url')
          .not('cover_url', 'is', null)
          .not('genres', 'cs', '{"Hentai"}')
          .limit(60)
          .then(({ data: d2 }) => load(d2 || []))
      })

    // Trending
    Promise.all([
      supabase.from('anime_meta')
        .select('series_id, trending, series!inner(id, title, cover_url)')
        .eq('season_year', 2026)
        .not('trending', 'is', null)
        .not('series.genres', 'cs', '{"Hentai"}')
        .order('trending', { ascending: true })
        .limit(4),
      supabase.from('manga_meta')
        .select('series_id, md_follows, series!inner(id, title, cover_url, updated_at)')
        .not('series.cover_url', 'is', null)
        .not('series.genres', 'cs', '{"Hentai"}')
        .order('md_follows', { ascending: false, nullsFirst: false })
        .limit(4),
      supabase.from('novel_meta')
        .select('series_id, series!inner(id, title, cover_url, updated_at)')
        .not('series.cover_url', 'is', null)
        .not('series.genres', 'cs', '{"Hentai"}')
        .order('series(updated_at)', { ascending: false })
        .limit(4),
    ]).then(([animeRes, mangaRes, novelRes]) => {
      const all: Cover[] = []
      if (animeRes.data) all.push(...animeRes.data.map((r: any) => ({ id: r.series.id, title: r.series.title, cover_url: r.series.cover_url })))
      if (mangaRes.data) all.push(...mangaRes.data.map((r: any) => ({ id: r.series.id, title: r.series.title, cover_url: r.series.cover_url })))
      if (novelRes.data) all.push(...novelRes.data.map((r: any) => ({ id: r.series.id, title: r.series.title, cover_url: r.series.cover_url })))
      const shuffled = [...all].sort(() => Math.random() - 0.5)
      setTrending(shuffled.slice(0, 8))
    })

    // Type counts
    Promise.all([
      supabase.from('series').select('anime_meta!inner(season_year)', { count: 'exact', head: true }).eq('item_type', 'anime').eq('anime_meta.season_year', 2026).not('genres', 'cs', '{"Hentai"}'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'manga').not('genres', 'cs', '{"Hentai"}'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'novel').not('genres', 'cs', '{"Hentai"}'),
    ]).then(([a, m, n]) => setTypeCounts({ anime: a.count ?? 0, manga: m.count ?? 0, novel: n.count ?? 0 }))
  }, [])

  // Cover wall columns
  const rightCovers = covers.slice(0, Math.ceil(covers.length * 0.6))
  const leftCovers  = covers.slice(Math.ceil(covers.length * 0.6))
  const rightCols = [0,1,2,3,4].map(i => rightCovers.filter((_, idx) => idx % 5 === i))
  const leftCols  = [0,1,2].map(i => leftCovers.filter((_, idx)  => idx % 3 === i))
  const hasCols = covers.length >= 8
  const R_SPEEDS  = [28,22,32,24,26]
  const R_OFFSETS = [0,-60,30,-30,50]
  const R_DELAYS  = [0,-8,-4,-14,-6]
  const L_SPEEDS  = [30,24,27]
  const L_OFFSETS = [-20,40,-40]
  const L_DELAYS  = [-5,-12,-2]

  const featureCards = [
    { color: '#6366f1', title: vi ? 'Khám phá & Lọc'    : 'Browse & Filter',  cta: vi ? 'Khám phá'    : 'Browse',      href: '/browse'  },
    { color: '#22c55e', title: vi ? 'Biểu đồ phân tán'  : 'Scatter Charts',   cta: vi ? 'Xem biểu đồ' : 'View Charts', href: '/charts'  },
    { color: '#ec4899', title: vi ? 'So sánh trực tiếp' : 'Head-to-Head',     cta: vi ? 'So sánh'     : 'Compare',     href: '/compare' },
  ]

  return (
    <div style={{ background: 'var(--background)' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col overflow-hidden" style={{ minHeight: '100svh' }}>

        {/* Cover wall */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 z-10"
            style={{ background: 'linear-gradient(to right, rgba(10,15,30,0.25) 0%, rgba(10,15,30,0.55) 18%, rgba(10,15,30,0.72) 34%, rgba(10,15,30,0.72) 66%, rgba(10,15,30,0.55) 82%, rgba(10,15,30,0.25) 100%)' }} />
          <div className="absolute inset-x-0 top-0 h-32 z-10" style={{ background: 'linear-gradient(to bottom, var(--background), transparent)' }} />
          <div className="absolute inset-x-0 bottom-0 h-40 z-10" style={{ background: 'linear-gradient(to top, var(--background), transparent)' }} />
          <div className="absolute inset-0 items-start overflow-hidden" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px', padding: '0 4px' }}>
            {hasCols
              ? [
                  { covers: leftCols[0].length ? leftCols[0] : covers.slice(0,6),  speed: L_SPEEDS[0], offset: L_OFFSETS[0], delay: L_DELAYS[0] },
                  { covers: leftCols[1].length ? leftCols[1] : covers.slice(0,6),  speed: L_SPEEDS[1], offset: L_OFFSETS[1], delay: L_DELAYS[1] },
                  { covers: leftCols[2].length ? leftCols[2] : covers.slice(0,6),  speed: L_SPEEDS[2], offset: L_OFFSETS[2], delay: L_DELAYS[2] },
                  { covers: rightCols[0].length ? rightCols[0] : covers.slice(0,6), speed: R_SPEEDS[0], offset: R_OFFSETS[0], delay: R_DELAYS[0] },
                  { covers: rightCols[1].length ? rightCols[1] : covers.slice(0,6), speed: R_SPEEDS[1], offset: R_OFFSETS[1], delay: R_DELAYS[1] },
                  { covers: rightCols[2].length ? rightCols[2] : covers.slice(0,6), speed: R_SPEEDS[2], offset: R_OFFSETS[2], delay: R_DELAYS[2] },
                  { covers: rightCols[3].length ? rightCols[3] : covers.slice(0,6), speed: R_SPEEDS[3], offset: R_OFFSETS[3], delay: R_DELAYS[3] },
                  { covers: rightCols[4].length ? rightCols[4] : covers.slice(0,6), speed: R_SPEEDS[4], offset: R_OFFSETS[4], delay: R_DELAYS[4] },
                ].map((col, i) => (
                  <CoverColumn key={i} covers={col.covers} speed={col.speed} offset={col.offset} delay={col.delay} />
                ))
              : Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 w-full">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div key={j} className="rounded-lg flex-shrink-0 animate-pulse"
                        style={{ aspectRatio: '2/3', background: 'rgba(99,102,241,0.07)' }} />
                    ))}
                  </div>
                ))
            }
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center">
          <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-16 py-24">
            <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase mb-5"
              style={{ color: '#818cf8', letterSpacing: '0.18em' }}>
              {vi ? 'Phân tích · Dữ liệu · Cộng đồng' : 'Analytics · Data · Community'}
            </p>
            <h1 className="font-black leading-none tracking-tight mb-6"
              style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', color: 'var(--foreground)', maxWidth: '10ch' }}>
              {vi ? (
                <>Khám phá<br /><span style={{ color: '#818cf8' }}>tựa tiếp</span><br />theo</>
              ) : (
                <>Discover<br /><span style={{ color: '#818cf8' }}>your next</span><br />obsession</>
              )}
            </h1>
            <p className="text-base sm:text-lg mb-10 max-w-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>
              {vi
                ? 'Điểm số, xu hướng và thống kê sâu cho Anime, Manga & Light Novel.'
                : 'Scores, trends and deep stats for Anime, Manga & Light Novels.'}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/browse"
                className="group flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5"
                style={{ background: '#6366f1', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
                <Sparkles className="w-4 h-4" />
                {vi ? 'Bắt đầu ngay' : 'Start Exploring'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/charts"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
                style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
                <BarChart2 className="w-4 h-4" />
                {vi ? 'Biểu đồ' : 'Charts'}
              </Link>
            </div>
            {typeCounts && (
              <p className="mt-8 text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
                <span style={{ color: 'rgba(129,140,248,0.65)' }}>{typeCounts.anime.toLocaleString()}</span> {vi ? 'anime' : 'anime'}
                {' · '}
                <span style={{ color: 'rgba(34,197,94,0.65)' }}>{typeCounts.manga.toLocaleString()}</span> {vi ? 'manga' : 'manga'}
                {' · '}
                <span style={{ color: 'rgba(236,72,153,0.65)' }}>{typeCounts.novel.toLocaleString()}</span> {vi ? 'light novel' : 'light novels'}
                {' '}{vi ? 'trong cơ sở dữ liệu' : 'in the database'}
              </p>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="relative z-20 flex justify-center pb-8">
          <div className="flex flex-col items-center gap-1 opacity-30">
            <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.4))' }} />
            <div className="w-1 h-1 rounded-full bg-white" />
          </div>
        </div>
      </section>

      {/* ══ CARDS SECTION ═════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">

          {/*
            Uniform 4-col grid on lg+, 2-col on md, 1-col on sm.
            All 4 cards share the same fixed height so they're perfectly aligned.
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            style={{ gridAutoRows: '220px' }}>

            {/* Trending — same size as feature cards */}
            {trending.length > 0 && (
              <TrendingCard items={trending} vi={vi} />
            )}

            {/* Feature cards */}
            {featureCards.map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes scrollUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  )
}
