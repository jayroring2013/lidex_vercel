'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  BarChart2, BookOpen, Tv, Book, TrendingUp, ArrowRight,
  Star, Users, Zap, Database, ChevronRight, Play
} from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { useLocale } from '@/contexts/LocaleContext'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats { totalAnime: number; totalManga: number; totalNovel: number; totalSeries: number }
interface FeaturedAnime { id: number; title: string; cover_url: string | null; score: number | null; studio: string | null; genres: string[] }

// ── Spotlight Card (Aceternity-style) ─────────────────────────────────────────
function SpotlightCard({ children, color = '#6366f1', className = '' }: {
  children: React.ReactNode; color?: string; className?: string
}) {
  const ref  = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0, show: false })
  return (
    <div
      ref={ref}
      onMouseMove={e => {
        if (!ref.current) return
        const r = ref.current.getBoundingClientRect()
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top, show: true })
      }}
      onMouseLeave={() => setPos(p => ({ ...p, show: false }))}
      className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${className}`}
      style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}
    >
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl transition-opacity duration-300"
        style={{ opacity: pos.show ? 1 : 0, background: `radial-gradient(250px circle at ${pos.x}px ${pos.y}px, ${color}18, transparent 70%)` }} />
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `inset 0 0 0 1px ${color}40` }} />
      {children}
    </div>
  )
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedNumber({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!target || started) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); observer.disconnect() }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, started])

  useEffect(() => {
    if (!started || !target) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start = Math.min(start + step, target)
      setCurrent(Math.round(start))
      if (start >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [started, target, duration])

  return <span ref={ref}>{current.toLocaleString()}</span>
}

// ── Cover card (featured anime) ───────────────────────────────────────────────
function CoverCard({ anime, rank }: { anime: FeaturedAnime; rank: number }) {
  const [err, setErr] = useState(false)
  return (
    <Link href={`/content/${anime.id}`} className="group relative block rounded-2xl overflow-hidden aspect-[2/3] flex-shrink-0 w-36 sm:w-44 transition-transform duration-300 hover:scale-[1.03] hover:-translate-y-1"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      {anime.cover_url && !err
        ? <img src={anime.cover_url} alt={anime.title} className="w-full h-full object-cover" onError={() => setErr(true)} />
        : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #6366f122, #6366f108)' }} />
      }
      {/* overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 40%, transparent)' }}>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs font-semibold line-clamp-2">{anime.title}</p>
          {anime.score && <p className="text-yellow-400 text-[10px] mt-0.5 font-bold">★ {anime.score}</p>}
        </div>
      </div>
      {/* rank badge */}
      <div className="absolute top-2 left-2 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
        style={{ background: '#6366f1', color: '#fff' }}>
        {rank}
      </div>
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { locale } = useLocale()
  const vi = locale === 'vi'

  const [stats,    setStats]    = useState<Stats | null>(null)
  const [featured, setFeatured] = useState<FeaturedAnime[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: animeCount },
        { count: mangaCount },
        { count: novelCount },
        { data: topAnime },
      ] = await Promise.all([
        supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'anime'),
        supabase.from('manga').select('id',  { count: 'exact', head: true }),
        supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'novel'),
        supabase.from('series')
          .select('id, title, cover_url, studio, anime_meta(mean_score, popularity)')
          .eq('item_type', 'anime')
          .not('cover_url', 'is', null)
          .order('anime_meta(popularity)', { ascending: false })
          .limit(6),
      ])
      const anime = animeCount ?? 0
      const manga = mangaCount ?? 0
      const novel = novelCount ?? 0
      setStats({ totalAnime: anime, totalManga: manga, totalNovel: novel, totalSeries: anime + manga + novel })
      setFeatured((topAnime || []).map((s: any) => ({
        id: s.id, title: s.title, cover_url: s.cover_url, studio: s.studio,
        score: s.anime_meta?.mean_score ?? null,
        genres: [],
      })))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--background)' }}>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">

        {/* Background mesh orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-[100px] opacity-20" style={{ background: '#6366f1' }} />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full blur-[120px] opacity-15" style={{ background: '#ec4899' }} />
          <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full blur-[80px] opacity-10" style={{ background: '#22c55e' }} />
        </div>

        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left: copy */}
          <div className="flex-1 text-center lg:text-left max-w-2xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Zap className="w-3 h-3" />
              {vi ? 'Dự án cộng đồng · Dữ liệu thực' : 'Community Project · Real Data'}
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-6">
              <span style={{ color: 'var(--foreground)' }}>
                {vi ? 'Phân tích dữ liệu' : 'Data analytics for'}
              </span>
              <br />
              <span style={{ color: '#6366f1' }}>
                {vi ? 'Anime · Manga' : 'Anime · Manga'}
              </span>
              <br />
              <span style={{ color: '#22c55e' }}>
                {vi ? '· Tiểu thuyết' : '· Light Novels'}
              </span>
            </h1>

            {/* Sub */}
            <p className="text-base sm:text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0" style={{ color: 'var(--foreground-secondary)' }}>
              {vi
                ? 'LiDex thu thập dữ liệu cộng đồng về xu hướng bình chọn, điểm số, mức độ phổ biến và phân tích chuyên sâu cho nội dung LN/Anime/Manga.'
                : 'LiDex aggregates community data on voting trends, scores, popularity, and deep analytics for LN/Anime/Manga content.'
              }
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Link href="/browse"
                className="group flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
                <BookOpen className="w-4 h-4" />
                {vi ? 'Khám phá nội dung' : 'Explore content'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/dashboard"
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: 'var(--glass-bg)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}>
                <BarChart2 className="w-4 h-4" />
                {vi ? 'Xem Dashboard' : 'View Dashboard'}
              </Link>
            </div>
          </div>

          {/* Right: featured covers */}
          <div className="flex-shrink-0 hidden md:flex items-end gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl animate-pulse flex-shrink-0"
                    style={{ width: i % 2 === 0 ? 144 : 176, aspectRatio: '2/3', background: 'var(--background-secondary)' }} />
                ))
              : featured.slice(0, 4).map((a, i) => (
                  <div key={a.id} style={{ marginBottom: i % 2 === 0 ? 0 : 24 }}>
                    <CoverCard anime={a} rank={i + 1} />
                  </div>
                ))
            }
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, var(--foreground-muted))' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--foreground-muted)' }} />
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ background: 'var(--background-secondary)', borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {[
              { icon: Tv,       label: vi ? 'Anime'         : 'Anime titles',  value: stats?.totalAnime   ?? 0, color: '#6366f1' },
              { icon: Book,     label: vi ? 'Manga'         : 'Manga series',  value: stats?.totalManga   ?? 0, color: '#ec4899' },
              { icon: BookOpen, label: vi ? 'Tiểu thuyết'   : 'Light Novels',  value: stats?.totalNovel   ?? 0, color: '#22c55e' },
              { icon: Database, label: vi ? 'Tổng tựa'      : 'Total series',  value: stats?.totalSeries  ?? 0, color: '#fbbf24' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black leading-none" style={{ color }}>
                    {loading ? '—' : <AnimatedNumber target={value} />}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-muted)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6366f1' }}>
              {vi ? 'Tính năng' : 'Features'}
            </p>
            <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: 'var(--foreground)' }}>
              {vi ? 'LiDex có gì?' : 'What is LiDex?'}
            </h2>
            <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: 'var(--foreground-secondary)' }}>
              {vi
                ? 'Không chỉ là danh sách — LiDex là nền tảng phân tích dữ liệu chuyên sâu cho cộng đồng Anime/Manga/LN.'
                : 'More than a list — LiDex is a deep analytics platform built for the Anime/Manga/LN community.'
              }
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon:  BarChart2,
                color: '#6366f1',
                title: vi ? 'Biểu đồ phân tán'       : 'Scatter Charts',
                desc:  vi
                  ? 'So sánh hàng nghìn tựa anime/novel theo điểm số, độ phổ biến, số tập và giá cả. Tìm ra xu hướng ẩn trong dữ liệu.'
                  : 'Compare thousands of anime/novels by score, popularity, episodes, and price. Uncover hidden trends in the data.',
                href:  '/charts',
                cta:   vi ? 'Xem biểu đồ' : 'View Charts',
              },
              {
                icon:  TrendingUp,
                color: '#ec4899',
                title: vi ? 'LiDex Score'             : 'LiDex Score',
                desc:  vi
                  ? 'Điểm tổng hợp độc quyền từ 7 chỉ số: điểm cộng đồng, độ phổ biến, yêu thích, phân phối điểm, tỷ lệ hoàn thành, trạng thái và uy tín studio.'
                  : 'Proprietary composite score from 7 signals: community score, popularity, favourites, score distribution, completion rate, status, and studio reputation.',
                href:  '/browse',
                cta:   vi ? 'Khám phá' : 'Explore',
              },
              {
                icon:  Users,
                color: '#22c55e',
                title: vi ? 'Dữ liệu cộng đồng'      : 'Community Data',
                desc:  vi
                  ? 'Theo dõi xu hướng bình chọn qua các kỳ. So sánh tựa cùng thể loại. Phân tích phân phối điểm và tỷ lệ người xem.'
                  : 'Track voting trends across periods. Compare titles by genre. Analyze score distributions and viewer completion rates.',
                href:  '/compare',
                cta:   vi ? 'So sánh' : 'Compare',
              },
              {
                icon:  Star,
                color: '#fbbf24',
                title: vi ? 'Xếp hạng chính xác'     : 'Accurate Rankings',
                desc:  vi
                  ? 'Xếp hạng dựa trên điểm trung bình, số lượt yêu thích và phân phối điểm — không phải chỉ số thô đơn thuần.'
                  : 'Rankings driven by mean score, favourite count, and score distribution — not just raw numbers.',
                href:  '/browse',
                cta:   vi ? 'Xem xếp hạng' : 'See Rankings',
              },
              {
                icon:  BookOpen,
                color: '#22c55e',
                title: vi ? 'Tiểu thuyết Việt Nam'   : 'Vietnamese Light Novels',
                desc:  vi
                  ? 'Dữ liệu bình chọn và thống kê tập sách cho thị trường LN Việt Nam — dữ liệu hiếm có khó tìm ở nơi khác.'
                  : 'Voting data and volume statistics for the Vietnamese LN market — data you cannot easily find elsewhere.',
                href:  '/browse',
                cta:   vi ? 'Xem tiểu thuyết' : 'View Novels',
              },
              {
                icon:  Database,
                color: '#6366f1',
                title: vi ? 'So sánh trực tiếp'      : 'Side-by-Side Compare',
                desc:  vi
                  ? 'So sánh lên đến 4 anime cùng lúc trên biểu đồ radar. Xem ngay điểm mạnh/yếu theo từng chỉ số cụ thể.'
                  : 'Compare up to 4 anime at once on a radar chart. Instantly see strengths and weaknesses across specific metrics.',
                href:  '/compare',
                cta:   vi ? 'So sánh ngay' : 'Compare Now',
              },
            ].map(f => (
              <SpotlightCard key={f.title} color={f.color} className="group hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-200">
                <div className="p-6 h-full flex flex-col">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${f.color}18` }}>
                    <f.icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: 'var(--foreground)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--foreground-secondary)' }}>{f.desc}</p>
                  <Link href={f.href}
                    className="mt-4 flex items-center gap-1.5 text-xs font-bold transition-colors group-hover:gap-2.5"
                    style={{ color: f.color }}>
                    {f.cta} <ChevronRight className="w-3.5 h-3.5 transition-all" />
                  </Link>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP ANIME PREVIEW ── */}
      <section style={{ background: 'var(--background-secondary)', borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)' }}
        className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6366f1' }}>
                {vi ? 'Phổ biến nhất' : 'Most Popular'}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--foreground)' }}>
                Top Anime
              </h2>
            </div>
            <Link href="/browse"
              className="flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-primary-400"
              style={{ color: 'var(--foreground-secondary)' }}>
              {vi ? 'Xem tất cả' : 'View all'} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-36 sm:w-44 rounded-2xl animate-pulse"
                    style={{ aspectRatio: '2/3', background: 'var(--glass-bg)' }} />
                ))
              : featured.map((a, i) => <CoverCard key={a.id} anime={a} rank={i + 1} />)
            }
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#22c55e' }}>
              {vi ? 'Hướng dẫn' : 'How it works'}
            </p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--foreground)' }}>
              {vi ? 'Bắt đầu trong 3 bước' : 'Start in 3 steps'}
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-10 left-[20%] right-[20%] h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #6366f155, #6366f155, transparent)' }} />

            {[
              {
                step: '01',
                color: '#6366f1',
                icon: BookOpen,
                title: vi ? 'Khám phá nội dung' : 'Browse Content',
                desc:  vi
                  ? 'Tìm kiếm và lọc Anime, Manga, Tiểu thuyết theo nhiều tiêu chí: điểm, thể loại, trạng thái, nhà xuất bản.'
                  : 'Search and filter Anime, Manga, Light Novels by score, genre, status, publisher and more.',
                href:  '/browse',
              },
              {
                step: '02',
                color: '#ec4899',
                icon: Star,
                title: vi ? 'Xem trang chi tiết' : 'View Series Detail',
                desc:  vi
                  ? 'Mỗi tựa có trang riêng với thống kê đầy đủ, biểu đồ radar, LiDex Score và phân tích chuyên sâu.'
                  : 'Each title has its own page with full stats, radar chart, LiDex Score and deep analysis.',
                href:  '/browse',
              },
              {
                step: '03',
                color: '#22c55e',
                icon: BarChart2,
                title: vi ? 'Phân tích & So sánh' : 'Analyze & Compare',
                desc:  vi
                  ? 'Dùng biểu đồ phân tán để khám phá xu hướng, hoặc so sánh trực tiếp nhiều anime cùng lúc.'
                  : 'Use scatter charts to discover trends, or compare multiple anime head-to-head on the compare page.',
                href:  '/charts',
              },
            ].map(s => (
              <div key={s.step} className="relative">
                <SpotlightCard color={s.color} className="group h-full">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-4xl font-black opacity-20" style={{ color: s.color }}>{s.step}</span>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${s.color}18` }}>
                        <s.icon className="w-5 h-5" style={{ color: s.color }} />
                      </div>
                    </div>
                    <h3 className="text-base font-bold mb-2" style={{ color: 'var(--foreground)' }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>{s.desc}</p>
                    <Link href={s.href}
                      className="mt-4 flex items-center gap-1.5 text-xs font-bold transition-colors"
                      style={{ color: s.color }}>
                      {vi ? 'Thử ngay' : 'Try it'} <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden p-10 sm:p-14"
            style={{ background: 'linear-gradient(135deg, #6366f122, #ec489914, #22c55e0a)', border: '1px solid rgba(99,102,241,0.25)' }}>
            {/* bg orb */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-20" style={{ background: '#6366f1' }} />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: 'var(--foreground)' }}>
                {vi ? 'Sẵn sàng chưa?' : 'Ready to explore?'}
              </h2>
              <p className="text-sm sm:text-base mb-8" style={{ color: 'var(--foreground-secondary)' }}>
                {vi
                  ? 'Hơn 3.000 tựa Anime, hàng nghìn Manga và Tiểu thuyết đang chờ bạn khám phá.'
                  : 'Over 3,000 Anime, thousands of Manga and Light Novels are waiting for you to explore.'
                }
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/browse"
                  className="group flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                  style={{ background: '#6366f1', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
                  <Play className="w-4 h-4" />
                  {vi ? 'Bắt đầu khám phá' : 'Start Exploring'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/charts"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all hover:scale-105"
                  style={{ background: 'var(--glass-bg)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}>
                  <BarChart2 className="w-4 h-4" />
                  {vi ? 'Xem biểu đồ' : 'View Charts'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
