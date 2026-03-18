'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, BookOpen, Tv, Book,
  Loader2, ArrowUpRight, Star, RefreshCw
} from 'lucide-react'
import {
  getSiteStats,
  getTrendingSeries,
  getTopRatedSeries,
  getSeriesCountByType,
} from '../../lib/supabase'
import StatsCard from '../../components/StatsCard'
import SeriesTable from '../../components/SeriesTable'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SiteStats {
  totalSeries: number
  totalAnime:  number
  totalManga:  number
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats,    setStats]    = useState<SiteStats | null>(null)
  const [trending, setTrending] = useState<any[]>([])
  const [topRated, setTopRated] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsData, trendingData, topRatedData] = await Promise.all([
          getSiteStats(),
          getTrendingSeries({ limit: 5 }),
          getTopRatedSeries({ limit: 5 }),
        ])

        setStats(statsData)
        setTrending(trendingData.data || [])
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

        {/* ── Page Header ── */}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatsCard
            icon={BookOpen}
            value={stats?.totalSeries?.toLocaleString() || '0'}
            label="Total Series"
            color="primary"
            trend={null}
          />
          <StatsCard
            icon={Tv}
            value={stats?.totalAnime?.toLocaleString() || '0'}
            label="Anime Titles"
            color="purple"
            trend={null}
          />
          <StatsCard
            icon={Book}
            value={stats?.totalManga?.toLocaleString() || '0'}
            label="Manga Series"
            color="pink"
            trend={null}
          />
        </div>

        {/* ── Tables Row ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Trending */}
          <div className="glass rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--card-border)' }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                  Trending This Week
                </h3>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-400 transition-colors"
              >
                View All <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4">
              <SeriesTable series={trending} type="trending" />
            </div>
          </div>

          {/* Top Rated */}
          <div className="glass rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--card-border)' }}
            >
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                  Top Rated
                </h3>
              </div>
            </div>
            <div className="p-4">
              <SeriesTable series={topRated} type="rated" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
