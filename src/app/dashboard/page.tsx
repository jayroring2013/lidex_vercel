'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, BookOpen, Tv, Book,
  Loader2, ArrowUpRight, Star
} from 'lucide-react'
import {
  getSiteStats,
  getTrendingSeries,
  getTopRatedSeries,
  getSeriesCountByType,
} from '../../lib/supabase'
import StatsCard from '../../components/StatsCard'
import DashboardChart from '../../components/DashboardChart'
import SeriesTable from '../../components/SeriesTable'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SiteStats {
  totalSeries: number
  totalAnime:  number
  totalManga:  number
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats,            setStats]            = useState<SiteStats | null>(null)
  const [trending,         setTrending]         = useState<any[]>([])
  const [topRated,         setTopRated]         = useState<any[]>([])
  const [typeDistribution, setTypeDistribution] = useState<number[]>([0, 0, 0])
  const [loading,          setLoading]          = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [
          statsData,
          trendingData,
          topRatedData,
          typeData,
        ] = await Promise.all([
          getSiteStats(),
          getTrendingSeries({ limit: 5 }),
          getTopRatedSeries({ limit: 5 }),
          getSeriesCountByType(),
        ])

        setStats(statsData)
        setTrending(trendingData.data  || [])
        setTopRated(topRatedData.data  || [])

        // ── typeDistribution: handle object array OR plain number array ───────
        const rawTypes = Array.isArray(typeData?.data)
          ? typeData.data
          : Array.isArray(typeData)
          ? typeData
          : []

        if (rawTypes.length  > 0) {
          if (typeof rawTypes[0] === 'number') {
            setTypeDistribution([rawTypes[0] || 0, rawTypes[1] || 0, rawTypes[2] || 0])
          } else {
            const getCount = (row: any) => Number(row?.count ?? row?.total ?? row?.value ?? 0)
            const getType  = (row: any): string => (row?.item_type ?? row?.type ?? row?.name ?? '').toLowerCase()

            const typeMap: Record<string, number> = {}
            for (const row of rawTypes) typeMap[getType(row)] = getCount(row)

            setTypeDistribution([
              typeMap['anime']       || 0,
              typeMap['manga']        || 0,
              typeMap['novel'] ?? typeMap['light_novel'] ?? typeMap['ln'] ?? 0,
            ])
          }
        }

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-primary mb-2">Dashboard</h1>
            <p className="text-gray-600 dark:text-secondary">Overview of all tracked content and community activity</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <span className="text-sm text-gray-600 dark:text-secondary">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
            <button
              onClick={() => window.location.reload()}
              className="p-2 glass rounded-lg hover:bg-hover-bg"
            >
              <Loader2 className="w-4 h-4 text-secondary" />
            </button>
          </div>
        </div>

        {/* ✅ Stats Overview - 3 Cards (Removed Total Votes) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
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
          {/* ✅ REMOVED: Total Votes StatsCard */}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-primary">Content Distribution</h3>
              <TrendingUp className="w-5 h-5 text-primary-500" />
            </div>
            <DashboardChart
              type="doughnut"
              data={typeDistribution}
              labels={['Anime', 'Manga', 'Novel']}
            />
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-primary">Top Rated</h3>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <SeriesTable series={topRated} type="rated" />
          </div>
        </div>
      </div>
    </div>
  )
}
