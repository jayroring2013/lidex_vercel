'use client'

import { useEffect, useState } from 'react'
import {
  BookOpen, Tv, Book, Loader2, Star, RefreshCw
} from 'lucide-react'
import {
  getSiteStats,
  getTopRatedSeries,
} from '../../lib/supabase'
import StatsCard from '../../components/StatsCard'
import SeriesTable from '../../components/SeriesTable'

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

        {/* ── Top Rated Table (full width) ── */}
        <div className="glass rounded-xl overflow-hidden">
          <div
            className="flex items-center gap-2 px-6 py-4"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              Top Rated
            </h3>
          </div>
          <div className="p-4">
            <SeriesTable series={topRated} type="rated" />
          </div>
        </div>

      </div>
    </div>
  )
}
