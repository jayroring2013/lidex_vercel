'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  BarChart3, TrendingUp, BookOpen, Tv, Book, 
  Heart, Loader2, ArrowUpRight, Star
} from 'lucide-react'
import { 
  getSiteStats, 
  getTrendingSeries, 
  getTopRatedSeries,
  getSeriesCountByType,
  getVoteStats
} from '../../lib/supabase'
import StatsCard from '../../components/StatsCard'
import DashboardChart from '../../components/DashboardChart'
import SeriesTable from '../../components/SeriesTable'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [trending, setTrending] = useState([])
  const [topRated, setTopRated] = useState([])
  const [typeDistribution, setTypeDistribution] = useState([])
  const [voteStats, setVoteStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [
          statsData,
          trendingData,
          topRatedData,
          typeData,
          voteData
        ] = await Promise.all([
          getSiteStats(),
          getTrendingSeries({ limit: 5 }),
          getTopRatedSeries({ limit: 5 }),
          getSeriesCountByType(),
          getVoteStats({ days: 30 })
        ])

        setStats(statsData)
        setTrending(trendingData.data || [])
        setTopRated(topRatedData.data || [])
        setTypeDistribution(Array.isArray(typeData.data) ? typeData.data : [0, 0, 0])
        setVoteStats(voteData.data || [])
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
          <p className="text-secondary">Overview of all tracked content and community activity</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <span className="text-sm text-secondary">
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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard 
          icon={BookOpen} 
          value={stats?.totalSeries?.toLocaleString() || '0'} 
          label="Total Series" 
          color="primary"
        />
        <StatsCard 
          icon={Tv} 
          value={stats?.totalAnime?.toLocaleString() || '0'} 
          label="Anime Titles" 
          color="purple"
        />
        <StatsCard 
          icon={Book} 
          value={stats?.totalManga?.toLocaleString() || '0'} 
          label="Manga Series" 
          color="pink"
        />
        <StatsCard 
          icon={Heart} 
          value={stats?.totalVotes?.toLocaleString() || '0'} 
          label="Total Votes" 
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Content Distribution Chart */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Content Distribution</h3>
            <TrendingUp className="w-5 h-5 text-primary-500" />
          </div>
          <DashboardChart 
            type="doughnut" 
            data={typeDistribution}
            labels={['Anime', 'Manga', 'Light Novels']}
          />
        </div>

        {/* Vote Activity Chart */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Vote Activity (30 Days)</h3>
            <Heart className="w-5 h-5 text-primary-500" />
          </div>
          <DashboardChart 
            type="line" 
            data={voteStats}
            label="Votes"
          />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trending Series */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Trending This Week</h3>
            <Link href="/dashboard" className="text-sm text-primary-500 hover:text-primary-600 flex items-center">
              View All <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <SeriesTable series={trending} type="trending" />
        </div>

        {/* Top Rated */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Top Rated</h3>
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <SeriesTable series={topRated} type="rated" />
        </div>
      </div>
    </div>
  )
}
