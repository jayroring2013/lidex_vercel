'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart2, BookOpen, ArrowRight, TrendingUp, GitCompare } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { useLocale } from '@/contexts/LocaleContext'

interface FeaturedAnime {
  id: number
  title: string
  cover_url: string | null
  score: number | null
}

function CoverStack({ items }: { items: FeaturedAnime[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div className="flex items-end gap-3">
      {items.slice(0, 5).map((a, i) => {
        const [err, setErr] = useState(false)
        const isHovered = hovered === i
        const offsets = [0, 16, 8, 20, 4]
        return (
          <Link
            key={a.id}
            href={`/content/${a.id}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300 block"
            style={{
              width: isHovered ? 128 : 96,
              aspectRatio: '2/3',
              marginBottom: offsets[i] ?? 0,
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.5)' : '0 8px 20px rgba(0,0,0,0.3)',
              transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
            }}
          >
            {a.cover_url && !err
              ? <img src={a.cover_url} alt={a.title} className="w-full h-full object-cover" onError={() => setErr(true)} />
              : <div className="w-full h-full" style={{ background: '#6366f122' }} />
            }
          </Link>
        )
      })}
    </div>
  )
}

export default function Home() {
  const { locale } = useLocale()
  const vi = locale === 'vi'
  const [featured, setFeatured] = useState<FeaturedAnime[]>([])
  const [stats, setStats]       = useState<{ anime: number; total: number } | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data }, { count: anime }, { count: total }] = await Promise.all([
        supabase.from('series')
          .select('id, title, cover_url, anime_meta(mean_score)')
          .eq('item_type', 'anime').not('cover_url', 'is', null)
          .order('anime_meta(popularity)', { ascending: false }).limit(5),
        supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'anime'),
        supabase.from('series').select('*', { count: 'exact', head: true }),
      ])
      setFeatured((data || []).map((s: any) => ({
        id: s.id, title: s.title, cover_url: s.cover_url,
        score: s.anime_meta?.mean_score ?? null,
      })))
      setStats({ anime: anime ?? 0, total: total ?? 0 })
    }
    load()
  }, [])

  const features = [
    {
      icon: TrendingUp,
      color: '#6366f1',
      title: vi ? 'Biểu đồ phân tích' : 'Analytics Charts',
      desc:  vi ? 'So sánh điểm, độ phổ biến và xu hướng' : 'Compare scores, popularity and trends',
      href:  '/charts',
    },
    {
      icon: BookOpen,
      color: '#22c55e',
      title: vi ? 'Khám phá nội dung' : 'Browse Content',
      desc:  vi ? 'Tìm Anime, Manga và Tiểu thuyết' : 'Find Anime, Manga and Light Novels',
      href:  '/browse',
    },
    {
      icon: GitCompare,
      color: '#ec4899',
      title: vi ? 'So sánh trực tiếp' : 'Compare Series',
      desc:  vi ? 'Đặt nhiều anime cạnh nhau' : 'Put multiple anime side by side',
      href:  '/compare',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>

      {/* ── Hero ── */}
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

            {/* Text */}
            <div className="flex-1 text-center lg:text-left">

              {/* Subtle badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-8"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                {stats
                  ? vi ? `${stats.total.toLocaleString()} tựa trong cơ sở dữ liệu` : `${stats.total.toLocaleString()} titles in database`
                  : 'LiDex Analytics'
                }
              </div>

              {/* Headline — 2 lines max */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
                <span style={{ color: 'var(--foreground)' }}>
                  {vi ? 'Dữ liệu & Phân tích' : 'Data & Analytics'}
                </span>
                <br />
                <span style={{ color: '#6366f1' }}>
                  {vi ? 'Anime · Manga · LN' : 'Anime · Manga · LN'}
                </span>
              </h1>

              {/* One-liner description */}
              <p className="text-base sm:text-lg mb-10 max-w-md mx-auto lg:mx-0" style={{ color: 'var(--foreground-secondary)' }}>
                {vi
                  ? 'Nền tảng phân tích dữ liệu cộng đồng — điểm số, xu hướng bình chọn và thống kê chuyên sâu.'
                  : 'A community data platform — scores, voting trends, and deep statistics.'
                }
              </p>

              {/* Single primary CTA + secondary */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link href="/browse"
                  className="group flex items-center gap-2.5 px-7 py-4 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                  style={{ background: '#6366f1', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
                  <BookOpen className="w-4 h-4" />
                  {vi ? 'Khám phá ngay' : 'Start Exploring'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/dashboard"
                  className="flex items-center gap-2 px-7 py-4 rounded-2xl text-sm font-bold transition-all hover:opacity-80"
                  style={{ color: 'var(--foreground-secondary)' }}>
                  <BarChart2 className="w-4 h-4" />
                  Dashboard
                </Link>
              </div>
            </div>

            {/* Cover art — desktop only */}
            <div className="hidden lg:block flex-shrink-0">
              {featured.length > 0
                ? <CoverStack items={featured} />
                : (
                  <div className="flex items-end gap-3">
                    {[96, 128, 96, 128, 96].map((w, i) => (
                      <div key={i} className="rounded-xl animate-pulse flex-shrink-0"
                        style={{ width: w, aspectRatio: '2/3', background: 'var(--background-secondary)', marginBottom: [0,16,8,20,4][i] }} />
                    ))}
                  </div>
                )
              }
            </div>
          </div>

          {/* ── 3 Feature pills — below hero, same section ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-16 sm:mt-20">
            {features.map(f => (
              <Link key={f.title} href={f.href}
                className="group flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: `${f.color}18` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-snug" style={{ color: 'var(--foreground)' }}>{f.title}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--foreground-muted)' }}>{f.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0"
                  style={{ color: f.color }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
