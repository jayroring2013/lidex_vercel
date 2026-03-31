'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  BarChart2, BookOpen, ArrowRight, TrendingUp, GitCompare,
  Star, Flame, ChevronDown, Sparkles,
} from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { useLocale } from '@/contexts/LocaleContext'

interface FeaturedAnime {
  id: number
  title: string
  cover_url: string | null
}

// ── Safe image ────────────────────────────────────────────────────────────────
function SafeImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false)
  if (err || !src) return <div className={`${className} bg-slate-800`} />
  return <img src={src} alt={alt} className={className} onError={() => setErr(true)} />
}

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = '', duration = 1600 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const t0 = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - t0) / duration, 1)
          setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    ob.observe(el)
    return () => ob.disconnect()
  }, [target, duration])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ── Cover wall — marquee-style scrolling banner rows ─────────────────────────
function CoverWall({ covers }: { covers: FeaturedAnime[] }) {
  // Duplicate for seamless loop
  const row = covers.length >= 3 ? covers : [...covers, ...covers, ...covers]
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Dark overlay — stronger at left where text sits */}
      <div className="absolute inset-0 z-10"
        style={{ background: 'linear-gradient(105deg, var(--background) 30%, rgba(15,23,42,0.85) 60%, rgba(15,23,42,0.4) 100%)' }} />
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 h-24 z-10"
        style={{ background: 'linear-gradient(to bottom, var(--background), transparent)' }} />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-10"
        style={{ background: 'linear-gradient(to top, var(--background), transparent)' }} />

      {/* Staggered cover columns */}
      <div className="absolute inset-0 flex gap-2 items-start justify-end pr-4 pt-0">
        {[0, 1, 2, 3, 4].map((col) => {
          const colCovers = row.filter((_, i) => i % 5 === col)
          const delay = [0, -4, -8, -2, -6][col]
          return (
            <div
              key={col}
              className="flex flex-col gap-2 flex-shrink-0"
              style={{
                width: 120,
                animation: `scrollUp 20s linear infinite`,
                animationDelay: `${delay}s`,
                marginTop: [0, 40, -20, 60, 20][col],
              }}
            >
              {[...colCovers, ...colCovers].map((a, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden flex-shrink-0"
                  style={{
                    aspectRatio: '2/3',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  {a.cover_url
                    ? <SafeImg src={a.cover_url} alt={a.title} className="w-full h-full object-cover block" />
                    : <div className="w-full h-full" style={{ background: 'rgba(99,102,241,0.15)' }} />
                  }
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Content type tag ────────────────────────────────────────────────────────
function TypeTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: `${color}22`, color: color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  )
}

// ── Feature pill card ──────────────────────────────────────────────────────
function FeaturePill({
  icon: Icon, label, href, accent,
}: { icon: any; label: string; href: string; accent: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
      style={{
        background: `${accent}15`,
        border: `1px solid ${accent}33`,
        color: accent,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
    </Link>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { locale } = useLocale()
  const vi = locale === 'vi'

  const [covers, setCovers] = useState<FeaturedAnime[]>([])
  const [heroCovers, setHeroCovers] = useState<FeaturedAnime[]>([])

  useEffect(() => {
    // Fetch more covers for the wall
    supabase.from('series')
      .select('id, title, cover_url, anime_meta(popularity)')
      .eq('item_type', 'anime')
      .not('cover_url', 'is', null)
      .order('anime_meta(popularity)', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          supabase.from('series')
            .select('id, title, cover_url')
            .eq('item_type', 'anime')
            .not('cover_url', 'is', null)
            .limit(20)
            .then(({ data: d2 }) => {
              const mapped = (d2 || []).map((s: any) => ({ id: s.id, title: s.title, cover_url: s.cover_url }))
              setCovers(mapped)
              setHeroCovers(mapped.slice(0, 5))
            })
        } else {
          const mapped = (data || []).map((s: any) => ({ id: s.id, title: s.title, cover_url: s.cover_url }))
          setCovers(mapped)
          setHeroCovers(mapped.slice(0, 5))
        }
      })
  }, [])

  const features = [
    { icon: BookOpen,  label: vi ? 'Khám phá'   : 'Browse',   href: '/browse',   accent: '#22c55e' },
    { icon: BarChart2, label: vi ? 'Biểu đồ'    : 'Charts',   href: '/charts',   accent: '#6366f1' },
    { icon: GitCompare,label: vi ? 'So sánh'    : 'Compare',  href: '/compare',  accent: '#ec4899' },
    { icon: TrendingUp,label: vi ? 'LiDex Score': 'Score',    href: '/browse',   accent: '#fbbf24' },
    { icon: BarChart2, label: vi ? 'Bảng xếp hạng' : 'Table', href: '/table',   accent: '#06b6d4' },
  ]

  const featureCards = [
    {
      icon: BookOpen,
      accent: '#22c55e',
      title: vi ? 'Thư viện đầy đủ' : 'Full Library',
      desc: vi
        ? 'Duyệt hàng nghìn Anime, Manga và Light Novel. Lọc theo thể loại, điểm số, trạng thái — tất cả trong một giao diện gọn gàng.'
        : 'Browse thousands of Anime, Manga & Light Novels. Filter by genre, score, status — all in one clean interface.',
      href: '/browse',
      mockup: 'grid',
    },
    {
      icon: BarChart2,
      accent: '#6366f1',
      title: vi ? 'Biểu đồ tương tác' : 'Interactive Charts',
      desc: vi
        ? 'Vẽ biểu đồ phân tán với trục X/Y bất kỳ. So sánh hàng nghìn tựa theo điểm cộng đồng, độ phổ biến, số tập.'
        : 'Plot scatter charts on any X/Y axis. Compare thousands of titles by community score, popularity, episode count.',
      href: '/charts',
      mockup: 'scatter',
    },
    {
      icon: GitCompare,
      accent: '#ec4899',
      title: vi ? 'So sánh trực tiếp' : 'Head-to-Head Compare',
      desc: vi
        ? 'Chọn tối đa 4 anime và đặt cạnh nhau trên biểu đồ radar. Xem ngay điểm mạnh và điểm yếu của từng tựa.'
        : 'Pick up to 4 anime and put them on a radar chart. Instantly see where each one shines and where it falls.',
      href: '/compare',
      mockup: 'radar',
    },
  ]

  return (
    <div className="flex flex-col" style={{ background: 'var(--background)' }}>

      {/* ══════════════ HERO — AniList-style cover wall ══════════════ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Scrolling cover wall background */}
        <CoverWall covers={covers.length > 0 ? covers : Array.from({ length: 10 }, (_, i) => ({ id: i, title: '', cover_url: null }))} />

        {/* Accent colour orb */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[200px] opacity-[0.07]"
            style={{ background: 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #ec4899)' }} />
        </div>

        {/* Hero content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">

            {/* Genre tags — feels like AniList */}
            <div className="flex flex-wrap gap-2 mb-7">
              {[
                { label: 'Anime', color: '#6366f1' },
                { label: 'Manga', color: '#ec4899' },
                { label: 'Light Novel', color: '#fbbf24' },
              ].map(t => <TypeTag key={t.label} {...t} />)}
            </div>

            {/* Main headline — casual, discovery-oriented */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-black leading-[1.03] tracking-tight mb-6 max-w-2xl"
              style={{ fontFamily: 'var(--font-inter), "Be Vietnam Pro", sans-serif' }}
            >
              <span style={{ color: 'var(--foreground)' }}>
                {vi ? 'Khám phá tựa' : 'Discover your'}
              </span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {vi ? 'tiếp theo của bạn ✦' : 'next obsession ✦'}
              </span>
            </h1>

            <p className="text-lg sm:text-xl leading-relaxed max-w-md mb-10"
              style={{ color: 'var(--foreground-secondary)' }}>
              {vi
                ? 'Điểm số, xu hướng và thống kê cho cộng đồng yêu thích Anime, Manga và Light Novel.'
                : 'Scores, trends and deep stats for fans of Anime, Manga & Light Novels.'}
            </p>

            {/* Primary CTA */}
            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href="/browse"
                className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl text-base font-bold text-white transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 8px 30px rgba(99,102,241,0.45)',
                }}
              >
                <Sparkles className="w-4 h-4" />
                {vi ? 'Bắt đầu khám phá' : 'Start Exploring'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--foreground)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {vi ? 'Dashboard' : 'Dashboard'}
              </Link>
            </div>

            {/* Quick-access feature pills */}
            <div className="flex flex-wrap gap-2">
              {features.map(f => <FeaturePill key={f.href + f.label} {...f} />)}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="relative z-20 flex justify-center pb-8">
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 opacity-40 hover:opacity-80 transition-opacity"
          >
            <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--foreground-muted)' }}>
              {vi ? 'Xem thêm' : 'More'}
            </span>
            <ChevronDown className="w-4 h-4 animate-bounce" style={{ color: 'var(--foreground-muted)' }} />
          </button>
        </div>
      </section>

      {/* ══════════════ POPULAR COVERS ROW — like MAL's banner ══════════════ */}
      {heroCovers.length > 0 && (
        <section className="py-10 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-5">
              <Flame className="w-4 h-4" style={{ color: '#f97316' }} />
              <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--foreground-muted)' }}>
                {vi ? 'Phổ biến nhất' : 'Most Popular'}
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {heroCovers.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/content/${anime.id}`}
                  className="group flex-shrink-0 relative rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.04] hover:-translate-y-1"
                  style={{ width: 140, aspectRatio: '2/3', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}
                >
                  {anime.cover_url
                    ? <SafeImg src={anime.cover_url} alt={anime.title} className="w-full h-full object-cover block" />
                    : <div className="w-full h-full bg-slate-800" />
                  }
                  {/* Hover overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)' }}>
                    <p className="text-[10px] font-semibold text-white leading-tight line-clamp-2">{anime.title}</p>
                  </div>
                </Link>
              ))}
              {/* See all card */}
              <Link
                href="/browse"
                className="flex-shrink-0 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.04]"
                style={{
                  width: 140,
                  aspectRatio: '2/3',
                  background: 'var(--background-secondary)',
                  border: '1px dashed var(--card-border)',
                  color: 'var(--foreground-muted)',
                }}
              >
                <ArrowRight className="w-5 h-5" />
                <span className="text-xs font-semibold text-center px-2">{vi ? 'Xem tất cả' : 'See all'}</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ FEATURE SECTIONS — scroll-based like fantasiabunko ══════════════ */}
      <section id="features" className="py-16 relative">

        {/* Section label */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
            <span className="text-xs font-bold uppercase tracking-widest px-3" style={{ color: 'var(--foreground-muted)' }}>
              {vi ? 'Công cụ' : 'Tools'}
            </span>
            <span className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
          {featureCards.map((card, idx) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'var(--glass-bg)',
                border: `1px solid ${card.accent}22`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 sm:p-8">

                {/* Icon badge */}
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{ background: `${card.accent}18`, border: `1px solid ${card.accent}33` }}
                >
                  <card.icon className="w-6 h-6" style={{ color: card.accent }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black mb-1.5" style={{ color: 'var(--foreground)' }}>
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
                    {card.desc}
                  </p>
                </div>

                {/* Inline mockup — compact */}
                <div className="hidden lg:block flex-shrink-0">
                  {card.mockup === 'grid' && (
                    <div className="grid grid-cols-3 gap-1.5 w-36">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-lg overflow-hidden" style={{ aspectRatio: '2/3', background: `${card.accent}18` }}>
                          {heroCovers[i] && <SafeImg src={heroCovers[i].cover_url!} alt="" className="w-full h-full object-cover block" />}
                        </div>
                      ))}
                    </div>
                  )}
                  {card.mockup === 'scatter' && (
                    <div className="w-36 h-24 relative" style={{ borderLeft: `1px solid ${card.accent}33`, borderBottom: `1px solid ${card.accent}33` }}>
                      {[
                        { x: 15, y: 65, s: 5 }, { x: 35, y: 50, s: 7 }, { x: 55, y: 75, s: 9 },
                        { x: 70, y: 35, s: 6 }, { x: 80, y: 80, s: 10 }, { x: 25, y: 25, s: 4 },
                        { x: 60, y: 55, s: 7 }, { x: 45, y: 40, s: 5 },
                      ].map((p, i) => (
                        <div key={i} className="absolute rounded-full" style={{
                          left: `${p.x}%`, bottom: `${p.y}%`,
                          width: p.s, height: p.s,
                          background: card.accent,
                          opacity: 0.6 + i * 0.04,
                          transform: 'translate(-50%, 50%)',
                        }} />
                      ))}
                    </div>
                  )}
                  {card.mockup === 'radar' && (
                    <div className="w-36 space-y-1.5">
                      {['Score', 'Popularity', 'Favs', 'Completion'].map((ax, i) => (
                        <div key={ax}>
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[9px]" style={{ color: 'var(--foreground-muted)' }}>{ax}</span>
                          </div>
                          <div className="relative h-1 rounded-full overflow-hidden" style={{ background: 'var(--background-secondary)' }}>
                            <div className="absolute left-0 top-0 h-full rounded-full opacity-60 transition-all"
                              style={{ width: `${[82, 74, 68, 90][i]}%`, background: card.accent }} />
                            <div className="absolute left-0 top-0 h-full rounded-full opacity-35"
                              style={{ width: `${[75, 88, 55, 78][i]}%`, background: '#6366f1' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <ArrowRight
                  className="hidden sm:block w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                  style={{ color: card.accent }}
                />
              </div>

              {/* Accent left border */}
              <div className="absolute left-0 top-6 bottom-6 w-0.5 rounded-full transition-all duration-300 group-hover:top-2 group-hover:bottom-2"
                style={{ background: card.accent }} />
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════ STATS — tsugirano-style bold numbers ══════════════ */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }} />
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)' }} />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6366f1' }}>
            {vi ? 'Dữ liệu' : 'By the numbers'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black mb-12" style={{ color: 'var(--foreground)' }}>
            {vi ? 'Toàn bộ vũ trụ trong một nơi' : 'The whole universe, one place'}
          </h2>

          <div className="grid grid-cols-3 gap-6">
            {[
              { val: 2000, suf: '+', label: vi ? 'Tựa' : 'Titles',     sub: vi ? 'Anime, Manga, LN' : 'Anime, Manga, LN', color: '#6366f1' },
              { val: 7,    suf: '',  label: vi ? 'Tín hiệu' : 'Signals', sub: vi ? 'LiDex Score'      : 'LiDex Score',      color: '#fbbf24' },
              { val: 3,    suf: '',  label: vi ? 'Loại ND' : 'Types',   sub: vi ? 'Anime · Manga · LN': 'Anime · Manga · LN', color: '#22c55e' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter mb-1"
                  style={{ color: s.color, fontFamily: 'var(--font-inter), sans-serif' }}>
                  <Counter target={s.val} suffix={s.suf} />
                </div>
                <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>{s.label}</p>
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ CTA — sneakerbunko-style bold closing ══════════════ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[160px] opacity-[0.08]"
            style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }} />
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Icon cluster */}
          <div className="flex justify-center gap-3 mb-6">
            {[
              { icon: Star,      color: '#fbbf24' },
              { icon: Flame,     color: '#f97316' },
              { icon: Sparkles,  color: '#6366f1' },
            ].map(({ icon: Icon, color }, i) => (
              <div key={i} className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: `${color}15`, border: `1px solid ${color}33` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            ))}
          </div>

          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-inter), sans-serif' }}>
            {vi ? (
              <>Tìm tựa <span style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>yêu thích</span> tiếp theo</>
            ) : (
              <>Find your <span style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>next favorite</span></>
            )}
          </h2>

          <p className="text-base mb-8" style={{ color: 'var(--foreground-secondary)' }}>
            {vi
              ? 'Duyệt kho dữ liệu, so sánh tựa và khám phá điều cộng đồng đang yêu thích nhất.'
              : 'Browse the data, compare titles, and discover what the community loves most.'}
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 6px 24px rgba(99,102,241,0.4)',
              }}
            >
              <BookOpen className="w-4 h-4" />
              {vi ? 'Khám phá ngay' : 'Browse Now'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/charts"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 hover:scale-105"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--foreground)',
              }}
            >
              <BarChart2 className="w-4 h-4" style={{ color: '#6366f1' }} />
              {vi ? 'Xem biểu đồ' : 'View Charts'}
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes scrollUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes grow { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  )
}
