'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, BarChart2, Flame } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { useLocale } from '@/contexts/LocaleContext'

interface Cover { id: number; title: string; cover_url: string | null }

// ── Safe image ────────────────────────────────────────────────────────────────
function SafeImg({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false)
  if (err) return <div className="w-full h-full" style={{ background: 'rgba(99,102,241,0.12)' }} />
  return <img src={src} alt={alt} className="w-full h-full object-cover block" onError={() => setErr(true)} />
}

// ── Scrolling cover column ────────────────────────────────────────────────────
function CoverColumn({ covers, speed, offset, delay }: {
  covers: Cover[]; speed: number; offset: number; delay: number
}) {
  const doubled = [...covers, ...covers]
  return (
    <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: 110, marginTop: offset }}>
      <div style={{ animation: `scrollUp ${speed}s linear infinite`, animationDelay: `${delay}s` }}
        className="flex flex-col gap-2">
        {doubled.map((c, i) => (
          <div key={i} className="rounded-lg overflow-hidden flex-shrink-0"
            style={{ aspectRatio: '2/3', border: '1px solid rgba(255,255,255,0.05)' }}>
            {c.cover_url ? <SafeImg src={c.cover_url} alt={c.title} /> : <div className="w-full h-full" style={{ background: 'rgba(99,102,241,0.1)' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { locale } = useLocale()
  const vi = locale === 'vi'

  const [covers,     setCovers]     = useState<Cover[]>([])
  const [popular,    setPopular]    = useState<Cover[]>([])
  const [statsCount, setStatsCount] = useState<number | null>(null)

  useEffect(() => {
    // Fetch covers from all types (anime, manga, novel) for the wall
    supabase.from('series')
      .select('id, title, cover_url, item_type')
      .in('item_type', ['anime', 'manga', 'novel'])
      .not('cover_url', 'is', null)
      .limit(60)
      .then(({ data, error }) => {
        const source = error ? null : data
        const load = (d: any[]) => {
          // Shuffle so types are mixed across columns
          const shuffled = [...d].sort(() => Math.random() - 0.5)
          const mapped: Cover[] = shuffled.map((s: any) => ({ id: s.id, title: s.title, cover_url: s.cover_url }))
          setCovers(mapped)
          setPopular(mapped.slice(0, 6))
        }
        if (source && source.length > 0) { load(source); return }
        supabase.from('series').select('id, title, cover_url').not('cover_url', 'is', null).limit(60)
          .then(({ data: d2 }) => load(d2 || []))
      })

    supabase.from('series').select('*', { count: 'exact', head: true })
      .then(({ count }) => setStatsCount(count))
  }, [])

  // Split covers into columns — 3 left, 5 right
  const rightCovers = covers.slice(0, Math.ceil(covers.length * 0.6))
  const leftCovers  = covers.slice(Math.ceil(covers.length * 0.6))
  const rightCols = [0, 1, 2, 3, 4].map(i => rightCovers.filter((_, idx) => idx % 5 === i))
  const leftCols  = [0, 1, 2].map(i => leftCovers.filter((_, idx) => idx % 3 === i))
  const hasCols = covers.length >= 8
  const R_SPEEDS  = [28, 22, 32, 24, 26]
  const R_OFFSETS = [0, -60, 30, -30, 50]
  const R_DELAYS  = [0, -8, -4, -14, -6]
  const L_SPEEDS  = [30, 24, 27]
  const L_OFFSETS = [-20, 40, -40]
  const L_DELAYS  = [-5, -12, -2]

  return (
    <div style={{ background: 'var(--background)' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col overflow-hidden" style={{ minHeight: '100svh' }}>

        {/* Cover wall — fills both sides */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Overlay — dims the art everywhere, stronger at edges, soft in center */}
          <div className="absolute inset-0 z-10"
            style={{ background: 'linear-gradient(to right, rgba(10,15,30,0.25) 0%, rgba(10,15,30,0.55) 18%, rgba(10,15,30,0.72) 34%, rgba(10,15,30,0.72) 66%, rgba(10,15,30,0.55) 82%, rgba(10,15,30,0.25) 100%)' }} />
          {/* Top + bottom vignette */}
          <div className="absolute inset-x-0 top-0 h-32 z-10" style={{ background: 'linear-gradient(to bottom, var(--background), transparent)' }} />
          <div className="absolute inset-x-0 bottom-0 h-40 z-10" style={{ background: 'linear-gradient(to top, var(--background), transparent)' }} />

          {/* LEFT columns */}
          <div className="absolute top-0 bottom-0 left-0 flex gap-2.5 items-start" style={{ width: '50%' }}>
            {hasCols
              ? [0,1,2].map(i => (
                  <CoverColumn key={i} covers={leftCols[i].length ? leftCols[i] : covers.slice(0, 6)} speed={L_SPEEDS[i]} offset={L_OFFSETS[i]} delay={L_DELAYS[i]} />
                ))
              : Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 flex-shrink-0" style={{ width: 110, marginTop: L_OFFSETS[i] }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div key={j} className="rounded-lg flex-shrink-0 animate-pulse"
                        style={{ aspectRatio: '2/3', background: 'rgba(99,102,241,0.07)' }} />
                    ))}
                  </div>
                ))
            }
          </div>

          {/* RIGHT columns */}
          <div className="absolute top-0 bottom-0 right-0 flex gap-2.5 items-start" style={{ width: '50%' }}>
            {hasCols
              ? [0,1,2,3,4].map(i => (
                  <CoverColumn key={i} covers={rightCols[i].length ? rightCols[i] : covers.slice(0, 6)} speed={R_SPEEDS[i]} offset={R_OFFSETS[i]} delay={R_DELAYS[i]} />
                ))
              : Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 flex-shrink-0" style={{ width: 110, marginTop: R_OFFSETS[i] }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div key={j} className="rounded-lg flex-shrink-0 animate-pulse"
                        style={{ aspectRatio: '2/3', background: 'rgba(99,102,241,0.07)' }} />
                    ))}
                  </div>
                ))
            }
          </div>
        </div>

        {/* Content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center">
          <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-16 py-24">

            {/* Eyebrow */}
            <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase mb-5"
              style={{ color: '#818cf8', letterSpacing: '0.18em' }}>
              {vi ? 'Phân tích · Dữ liệu · Cộng đồng' : 'Analytics · Data · Community'}
            </p>

            {/* Headline — large, clean, no gradient on colored text */}
            <h1 className="font-black leading-none tracking-tight mb-6"
              style={{
                fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
                fontFamily: 'var(--font-inter), "Be Vietnam Pro", sans-serif',
                color: 'var(--foreground)',
                maxWidth: '10ch',
              }}>
              {vi ? (
                <>Khám phá<br /><span style={{ color: '#818cf8' }}>tựa tiếp</span><br />theo</>
              ) : (
                <>Discover<br /><span style={{ color: '#818cf8' }}>your next</span><br />obsession</>
              )}
            </h1>

            {/* One-liner */}
            <p className="text-base sm:text-lg mb-10 max-w-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>
              {vi
                ? 'Điểm số, xu hướng và thống kê sâu cho Anime, Manga & Light Novel.'
                : 'Scores, trends and deep stats for Anime, Manga & Light Novels.'}
            </p>

            {/* Two CTAs — primary + ghost */}
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

            {/* Subtle stat line */}
            {statsCount && (
              <p className="mt-8 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {statsCount.toLocaleString()} {vi ? 'tựa trong cơ sở dữ liệu' : 'titles in the database'}
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

      {/* ══ POPULAR ROW ═══════════════════════════════════════════════════════ */}
      {popular.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" style={{ color: '#f97316' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--foreground-muted)' }}>
                  {vi ? 'Phổ biến nhất' : 'Most Popular'}
                </span>
              </div>
              <Link href="/browse"
                className="group flex items-center gap-1 text-xs font-semibold transition-colors hover:text-primary-400"
                style={{ color: 'var(--foreground-muted)' }}>
                {vi ? 'Xem tất cả' : 'See all'}
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {popular.map(anime => (
                <Link key={anime.id} href={`/content/${anime.id}`}
                  className="group flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.04] hover:-translate-y-1"
                  style={{ width: 130, aspectRatio: '2/3', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
                  {anime.cover_url
                    ? <SafeImg src={anime.cover_url} alt={anime.title} />
                    : <div className="w-full h-full" style={{ background: 'var(--background-secondary)' }} />
                  }
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ FEATURES ══════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">

          <div className="grid sm:grid-cols-3 gap-px rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-border)' }}>
            {[
              {
                color:  '#6366f1',
                eyebrow: vi ? 'Tính năng' : 'Feature',
                title:  vi ? 'Khám phá & Lọc' : 'Browse & Filter',
                desc:   vi ? 'Tìm Anime, Manga, LN theo điểm, thể loại, studio và trạng thái.' : 'Find Anime, Manga, LN by score, genre, studio and status.',
                href:   '/browse',
                cta:    vi ? 'Khám phá' : 'Browse',
              },
              {
                color:  '#22c55e',
                eyebrow: vi ? 'Tính năng' : 'Feature',
                title:  vi ? 'Biểu đồ phân tán' : 'Scatter Charts',
                desc:   vi ? 'So sánh hàng nghìn tựa trên biểu đồ tương tác. Zoom, kéo, lọc.' : 'Compare thousands of titles on an interactive chart. Zoom, pan, filter.',
                href:   '/charts',
                cta:    vi ? 'Xem biểu đồ' : 'View Charts',
              },
              {
                color:  '#ec4899',
                eyebrow: vi ? 'Tính năng' : 'Feature',
                title:  vi ? 'So sánh trực tiếp' : 'Head-to-Head',
                desc:   vi ? 'Đặt 4 anime cạnh nhau trên biểu đồ radar. Thấy ngay điểm mạnh yếu.' : 'Put 4 anime side by side on a radar chart. Instantly see strengths.',
                href:   '/compare',
                cta:    vi ? 'So sánh' : 'Compare',
              },
            ].map(f => (
              <Link key={f.title} href={f.href}
                className="group flex flex-col gap-4 p-6 sm:p-8 transition-colors duration-200"
                style={{ background: 'var(--glass-bg)' }}
                onMouseEnter={e => (e.currentTarget.style.background = `${f.color}08`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--glass-bg)')}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${f.color}18` }}>
                  <div className="w-3 h-3 rounded-sm" style={{ background: f.color }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: f.color }}>{f.eyebrow}</p>
                  <h3 className="text-base font-bold mb-2" style={{ color: 'var(--foreground)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>{f.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold mt-auto transition-gap duration-200"
                  style={{ color: f.color }}>
                  {f.cta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
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
