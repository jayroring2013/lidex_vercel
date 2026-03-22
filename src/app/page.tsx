'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  BarChart2, BookOpen, ArrowRight, TrendingUp, GitCompare,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { useLocale } from '@/contexts/LocaleContext'

interface FeaturedAnime {
  id: number
  title: string
  cover_url: string | null
}

// ── Safe image component (no useState in map) ─────────────────────────────────
function SafeImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false)
  if (err || !src) return <div className={`${className} bg-slate-800`} />
  return <img src={src} alt={alt} className={className} onError={() => setErr(true)} />
}

// ── Slide definitions ─────────────────────────────────────────────────────────
function useSlides(vi: boolean, featured: FeaturedAnime[]) {
  return [
    {
      id:       'welcome',
      accent:   '#6366f1',
      eyebrow:  vi ? 'Chào mừng đến LiDex' : 'Welcome to LiDex',
      title:    vi ? ['Theo dõi & Phân tích', 'Anime · Manga · LN'] : ['Track & Analyze', 'Anime · Manga · LN'],
      desc:     vi
        ? 'Nền tảng dữ liệu cộng đồng với điểm số, xu hướng bình chọn và thống kê chuyên sâu cho thế giới Anime, Manga và Light Novel.'
        : 'A community data platform with scores, voting trends, and deep statistics for the world of Anime, Manga and Light Novels.',
      cta:      { label: vi ? 'Bắt đầu khám phá' : 'Start Exploring', href: '/browse', icon: BookOpen },
      visual:   'covers',
    },
    {
      id:       'browse',
      accent:   '#22c55e',
      eyebrow:  vi ? 'Tính năng 01' : 'Feature 01',
      title:    vi ? ['Khám phá', 'Hàng nghìn tựa'] : ['Browse', 'Thousands of titles'],
      desc:     vi
        ? 'Tìm kiếm và lọc Anime, Manga, Tiểu thuyết theo điểm số, thể loại, trạng thái và nhà xuất bản. Giao diện trực quan với thẻ bìa đẹp mắt.'
        : 'Search and filter Anime, Manga, Light Novels by score, genre, status and publisher. Clean card UI with cover art.',
      cta:      { label: vi ? 'Khám phá ngay' : 'Browse Now', href: '/browse', icon: BookOpen },
      visual:   'browse',
    },
    {
      id:       'charts',
      accent:   '#6366f1',
      eyebrow:  vi ? 'Tính năng 02' : 'Feature 02',
      title:    vi ? ['Biểu đồ', 'Phân tán'] : ['Scatter', 'Charts'],
      desc:     vi
        ? 'So sánh hàng nghìn tựa trên một biểu đồ tương tác. Trục X/Y tùy chỉnh: điểm số, độ phổ biến, số tập, giá cả. Lọc theo mùa, studio, nhà xuất bản.'
        : 'Compare thousands of titles on one interactive chart. Custom X/Y axes: score, popularity, episodes, price. Filter by season, studio, publisher.',
      cta:      { label: vi ? 'Xem biểu đồ' : 'View Charts', href: '/charts', icon: BarChart2 },
      visual:   'chart',
    },
    {
      id:       'compare',
      accent:   '#ec4899',
      eyebrow:  vi ? 'Tính năng 03' : 'Feature 03',
      title:    vi ? ['So sánh', 'Trực tiếp'] : ['Side-by-Side', 'Compare'],
      desc:     vi
        ? 'Chọn tối đa 4 anime và so sánh cạnh nhau trên biểu đồ radar. Thấy ngay điểm mạnh/yếu về điểm số, độ phổ biến, yêu thích và mức độ hoàn thành.'
        : 'Pick up to 4 anime and compare them on a radar chart. Instantly see strengths and weaknesses across score, popularity, favourites and completion.',
      cta:      { label: vi ? 'So sánh ngay' : 'Compare Now', href: '/compare', icon: GitCompare },
      visual:   'compare',
    },
    {
      id:       'score',
      accent:   '#fbbf24',
      eyebrow:  vi ? 'Tính năng 04' : 'Feature 04',
      title:    vi ? ['LiDex Score', 'Điểm tổng hợp'] : ['LiDex Score', 'Composite Rating'],
      desc:     vi
        ? 'Điểm tổng hợp độc quyền từ 7 chỉ số: điểm cộng đồng, độ phổ biến, yêu thích, phân phối điểm, tỷ lệ hoàn thành, trạng thái và uy tín studio.'
        : 'Our proprietary composite score from 7 signals: community score, popularity, favourites, score distribution, completion rate, status, and studio reputation.',
      cta:      { label: vi ? 'Khám phá' : 'Explore', href: '/browse', icon: TrendingUp },
      visual:   'score',
    },
  ]
}

// ── Visual panels per slide ───────────────────────────────────────────────────
function SlideVisual({ visual, accent, featured }: { visual: string; accent: string; featured: FeaturedAnime[] }) {
  if (visual === 'covers') {
    return (
      <div className="flex items-end gap-3 justify-center lg:justify-start">
        {featured.slice(0, 5).map((a, i) => (
          <Link key={a.id} href={`/content/${a.id}`}
            className="flex-shrink-0 rounded-xl overflow-hidden transition-transform duration-200 hover:scale-105 hover:-translate-y-2"
            style={{
              width: [80, 96, 80, 96, 72][i],
              aspectRatio: '2/3',
              marginBottom: [0, 20, 8, 24, 4][i],
              border: '2px solid rgba(255,255,255,0.08)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }}>
            {a.cover_url
              ? <SafeImg src={a.cover_url} alt={a.title} className="w-full h-full object-cover block" />
              : <div className="w-full h-full" style={{ background: `${accent}22` }} />
            }
          </Link>
        ))}
        {featured.length === 0 && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 rounded-xl animate-pulse"
            style={{ width: [80,96,80,96,72][i], aspectRatio: '2/3', marginBottom: [0,20,8,24,4][i], background: 'var(--background-secondary)' }} />
        ))}
      </div>
    )
  }

  if (visual === 'browse') {
    return (
      <div className="grid grid-cols-2 gap-3 w-72">
        {['Chainsaw Man', 'Frieren', 'Jujutsu Kaisen', 'Spy × Family'].map((title, i) => (
          <div key={title} className="rounded-xl p-3 flex flex-col gap-2"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
            <div className="aspect-[3/2] rounded-lg" style={{ background: `${accent}${['22','18','14','1a'][i]}` }} />
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>{title}</p>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold" style={{ color: '#fbbf24' }}>★ {[8.7,9.0,8.5,8.8][i]}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (visual === 'chart') {
    // Mini scatter chart mockup
    const points = [
      { x: 20, y: 70, s: 6 }, { x: 35, y: 55, s: 8 }, { x: 50, y: 80, s: 10 },
      { x: 65, y: 40, s: 7 }, { x: 80, y: 85, s: 12 }, { x: 25, y: 30, s: 5 },
      { x: 55, y: 60, s: 9 }, { x: 70, y: 75, s: 11 }, { x: 40, y: 45, s: 6 },
      { x: 85, y: 55, s: 8 },
    ]
    return (
      <div className="rounded-2xl p-4 w-72" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4" style={{ color: accent }} />
          <span className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>Scatter Chart</span>
        </div>
        <div className="relative h-44" style={{ borderLeft: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)' }}>
          {points.map((p, i) => (
            <div key={i} className="absolute rounded-full transition-transform hover:scale-150"
              style={{
                left: `${p.x}%`, bottom: `${p.y}%`,
                width: p.s, height: p.s,
                background: accent,
                opacity: 0.7 + i * 0.03,
                transform: 'translate(-50%, 50%)',
              }} />
          ))}
          {/* highlight one */}
          <div className="absolute rounded-full ring-2 ring-white"
            style={{ left: '50%', bottom: '80%', width: 14, height: 14, background: accent, transform: 'translate(-50%, 50%)' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>Popularity →</span>
          <span className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>Score ↑</span>
        </div>
      </div>
    )
  }

  if (visual === 'compare') {
    const axes = ['Score', 'Pop.', 'Favs', 'Dist.', 'Viewers', 'Status']
    const seriesA = [85, 72, 68, 78, 90, 80]
    const seriesB = [78, 88, 55, 65, 75, 60]
    return (
      <div className="rounded-2xl p-5 w-64" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>Radar Compare</span>
          <div className="flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
          </div>
        </div>
        <div className="space-y-2">
          {axes.map((ax, i) => (
            <div key={ax}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>{ax}</span>
                <div className="flex gap-1 text-[10px] font-bold">
                  <span style={{ color: accent }}>{seriesA[i]}</span>
                  <span style={{ color: 'var(--foreground-muted)' }}>/</span>
                  <span style={{ color: '#6366f1' }}>{seriesB[i]}</span>
                </div>
              </div>
              <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--background-secondary)' }}>
                <div className="absolute left-0 top-0 h-full rounded-full opacity-60"
                  style={{ width: `${seriesA[i]}%`, background: accent }} />
                <div className="absolute left-0 top-0 h-full rounded-full opacity-40"
                  style={{ width: `${seriesB[i]}%`, background: '#6366f1' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (visual === 'score') {
    return (
      <div className="rounded-2xl p-5 w-64" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>LiDex Score</span>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-black"
            style={{ background: `${accent}22`, color: accent }}>A</div>
        </div>
        <div className="flex items-end gap-2 mb-5">
          <span className="text-5xl font-black leading-none" style={{ color: accent }}>87.4</span>
          <span className="text-sm mb-1" style={{ color: 'var(--foreground-muted)' }}>/100</span>
        </div>
        {[
          { label: 'Community Score', val: 94 },
          { label: 'Popularity',      val: 82 },
          { label: 'Favourites',      val: 78 },
          { label: 'Distribution',    val: 88 },
          { label: 'Viewer Engagement', val: 91 },
        ].map(({ label, val }) => (
          <div key={label} className="mb-2">
            <div className="flex justify-between mb-0.5">
              <span className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>{label}</span>
              <span className="text-[10px] font-bold" style={{ color: accent }}>{val}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--background-secondary)' }}>
              <div className="h-full rounded-full" style={{ width: `${val}%`, background: accent, opacity: 0.8 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { locale } = useLocale()
  const vi = locale === 'vi'

  const [featured,    setFeatured]    = useState<FeaturedAnime[]>([])
  const [slideIndex,  setSlideIndex]  = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [autoPlay,    setAutoPlay]    = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const slides = useSlides(vi, featured)
  const slide  = slides[slideIndex]
  const INTERVAL = 5000

  useEffect(() => {
    supabase.from('series')
      .select('id, title, cover_url, anime_meta(popularity)')
      .eq('item_type', 'anime')
      .not('cover_url', 'is', null)
      .order('anime_meta(popularity)', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (error) {
          // fallback: just get any anime with covers, no ordering by related table
          supabase.from('series')
            .select('id, title, cover_url')
            .eq('item_type', 'anime')
            .not('cover_url', 'is', null)
            .limit(5)
            .then(({ data: d2 }) => setFeatured((d2 || []).map((s: any) => ({ id: s.id, title: s.title, cover_url: s.cover_url }))))
        } else {
          setFeatured((data || []).map((s: any) => ({ id: s.id, title: s.title, cover_url: s.cover_url })))
        }
      })
  }, [])

  const goTo = useCallback((idx: number) => {
    if (transitioning) return
    setTransitioning(true)
    setTimeout(() => {
      setSlideIndex(idx)
      setTransitioning(false)
    }, 220)
  }, [transitioning])

  const next = useCallback(() => goTo((slideIndex + 1) % slides.length), [slideIndex, slides.length, goTo])
  const prev = useCallback(() => goTo((slideIndex - 1 + slides.length) % slides.length), [slideIndex, slides.length, goTo])

  useEffect(() => {
    if (!autoPlay) return
    timerRef.current = setInterval(next, INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [autoPlay, next])

  const handleDot = (i: number) => { setAutoPlay(false); goTo(i) }
  const handleArrow = (fn: () => void) => { setAutoPlay(false); fn() }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>

      {/* ── Full-screen carousel ── */}
      <div className="flex-1 relative flex flex-col min-h-screen overflow-hidden">

        {/* Ambient bg orb — changes color per slide */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-700">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[150px] opacity-15 transition-colors duration-700"
            style={{ background: slide.accent }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[100px] opacity-10 transition-colors duration-700"
            style={{ background: slide.accent }} />
        </div>

        {/* Dot grid texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Slide content */}
        <div
          className="relative flex-1 flex items-center"
          style={{ opacity: transitioning ? 0 : 1, transition: 'opacity 0.22s ease' }}
        >
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

              {/* Text */}
              <div className="flex-1 text-center lg:text-left">
                <p className="text-xs font-bold uppercase tracking-widest mb-4 transition-colors duration-300"
                  style={{ color: slide.accent }}>
                  {slide.eyebrow}
                </p>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.0] mb-6">
                  <span style={{ color: 'var(--foreground)' }}>{slide.title[0]}</span>
                  <br />
                  <span style={{ color: slide.accent, transition: 'color 0.3s' }}>{slide.title[1]}</span>
                </h1>

                <p className="text-base sm:text-lg leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0"
                  style={{ color: 'var(--foreground-secondary)' }}>
                  {slide.desc}
                </p>

                <Link
                  href={slide.cta.href}
                  className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                  style={{ background: slide.accent, boxShadow: `0 8px 24px ${slide.accent}44`, transition: 'background 0.3s, box-shadow 0.3s' }}
                >
                  <slide.cta.icon className="w-4 h-4" />
                  {slide.cta.label}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Visual panel — desktop */}
              <div className="hidden lg:flex flex-shrink-0 items-center justify-center w-80">
                <SlideVisual visual={slide.visual} accent={slide.accent} featured={featured} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="relative pb-10 flex items-center justify-center gap-6">

          {/* Prev */}
          <button
            onClick={() => handleArrow(prev)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground-secondary)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => handleDot(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width:   slideIndex === i ? 24 : 8,
                  height:  8,
                  background: slideIndex === i ? slide.accent : 'var(--card-border)',
                }}
              />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => handleArrow(next)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground-secondary)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        {autoPlay && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--card-border)' }}>
            <div
              key={slideIndex}
              className="h-full rounded-full"
              style={{
                background: slide.accent,
                animation: `grow ${INTERVAL}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes grow { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  )
}
