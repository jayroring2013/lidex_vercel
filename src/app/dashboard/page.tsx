'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Tv, Book, Loader2, RefreshCw } from 'lucide-react'
import { getSiteStats, getTopRatedSeries } from '../../lib/supabase'
import StatsCard from '../../components/StatsCard'
import Link from 'next/link'

interface SiteStats {
  totalSeries: number
  totalAnime:  number
  totalManga:  number
}

export default function Dashboard() {
  const [stats,    setStats]    = useState<SiteStats | null>(null)
  const [topRated, setTopRated] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsData, topRatedData] = await Promise.all([
          getSiteStats(),
          getTopRatedSeries({ limit: 10 }),
        ])
        setStats(statsData)
        setTopRated(topRatedData.data || [])
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--background)' }}>
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
              Dashboard
            </h1>
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Overview of all tracked content and community activity
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
            <button
              onClick={() => window.location.reload()}
              className="p-2 glass rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
            </button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatsCard icon={BookOpen} value={stats?.totalSeries?.toLocaleString() || '0'} label="Total Series"  color="primary" trend={null} />
          <StatsCard icon={Tv}       value={stats?.totalAnime?.toLocaleString()  || '0'} label="Anime Titles"  color="purple"  trend={null} />
          <StatsCard icon={Book}     value={stats?.totalManga?.toLocaleString()  || '0'} label="Manga Series"  color="pink"    trend={null} />
        </div>

        {/* ── Top 10 ── */}
        {topRated.length > 0 && (
          <div>
            {/* Section label */}
            <div className="flex items-baseline gap-3 mb-6">
              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
                Top
              </h2>
              <span className="text-2xl font-extrabold text-primary-500">10</span>
              <span className="text-sm ml-1" style={{ color: 'var(--foreground-secondary)' }}>
                highest rated series
              </span>
            </div>

            {/* Grid — 5 per row on desktop, 2 on mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-2 gap-y-8">
              {topRated.map((series, i) => (
                <TopCard key={series.id} series={series} rank={i + 1} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Top 10 Card ───────────────────────────────────────────────────────────────
function TopCard({ series, rank }: { series: any; rank: number }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <div className="relative flex items-end group">

      {/* Big rank number — sits behind the card, bleeds left */}
      <span
        className="absolute left-0 bottom-0 select-none pointer-events-none font-black leading-none z-0"
        style={{
          fontSize:          'clamp(72px, 10vw, 110px)',
          color:             'transparent',
          WebkitTextStroke:  '2px rgba(148,163,184,0.35)',
          transform:         'translateX(-35%)',
          lineHeight:        1,
          bottom:            '-8px',
          fontFamily:        '"Arial Black", "Impact", sans-serif',
          letterSpacing:     '-4px',
        }}
      >
        {rank}
      </span>

      {/* Cover card */}
      <Link
        href={`/content/${series.id}`}
        className="relative z-10 ml-auto w-[78%] block rounded-xl overflow-hidden shadow-xl transition-transform duration-200 group-hover:scale-105"
        style={{ border: '2px solid var(--card-border)' }}
      >
        {series.cover_url && !imgErr ? (
          <img
            src={series.cover_url}
            alt={series.title}
            className="w-full aspect-[2/3] object-cover block"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div
            className="w-full aspect-[2/3] flex items-center justify-center p-3"
            style={{ background: 'var(--background-secondary)' }}
          >
            <p className="text-xs font-semibold text-center line-clamp-3" style={{ color: 'var(--foreground-secondary)' }}>
              {series.title}
            </p>
          </div>
        )}

        {/* Score badge */}
        {series.score && (
          <div
            className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.75)', color: '#fbbf24', backdropFilter: 'blur(4px)' }}
          >
            ★ {series.score}
          </div>
        )}

        {/* Title overlay on hover */}
        <div
          className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 40%, transparent)' }}
        >
          <p className="text-white text-xs font-semibold px-2 pb-2 line-clamp-2">
            {series.title}
          </p>
        </div>
      </Link>
    </div>
  )
}
