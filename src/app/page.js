'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Tv, Book, Heart, Loader2, Star } from 'lucide-react'
import { getSiteStats, getTrendingSeries } from '@/lib/supabase'
import StatsCard from '@/components/StatsCard'
import SeriesCard from '@/components/SeriesCard'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Home() {
  const [stats, setStats] = useState(null)
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, trendingData] = await Promise.all([
          getSiteStats(),
          getTrendingSeries({ limit: 3 })
        ])
        setStats(statsData)
        setTrending(trendingData.data || [])
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center space-x-2 glass px-4 py-2 mb-6">
              <span className="text-sm text-secondary">👋 A personal project by Jay Roring</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
              Tracking & Analyzing<br />
              <span className="gradient-text">Light Novels, Anime & Manga</span>
            </h1>

            <p className="text-lg text-secondary max-w-2xl mx-auto mb-10">
              Community-driven data project tracking popularity trends,
              voting patterns, and analytics for LN/Anime/Manga.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="btn-primary flex items-center space-x-2">
                <BarChart2 className="w-5 h-5" />
                <span>View Dashboard</span>
              </Link>
              <a
                href="https://github.com/jayroring2013/bxh"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center space-x-2"
              >
                <Github className="w-5 h-5" />
                <span>View on GitHub</span>
              </a>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 animate-slide-up">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <StatsCard key={i} loading />
              ))
            ) : stats ? (
              <>
                <StatsCard icon={BookOpen} value={stats.totalSeries.toLocaleString()} label="Total Series" color="primary" />
                <StatsCard icon={Tv} value={stats.totalAnime.toLocaleString()} label="Anime Titles" color="purple" />
                <StatsCard icon={Book} value={stats.totalManga.toLocaleString()} label="Manga Series" color="pink" />
                <StatsCard icon={Heart} value={stats.totalVotes.toLocaleString()} label="Total Votes" color="green" />
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-20 px-4 bg-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2">Trending This Week</h2>
              <p className="text-secondary">Based on community votes and views</p>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading trending content..." />
          ) : trending.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {trending.map((series, index) => (
                <SeriesCard key={series.id} series={series} rank={index + 1} />
              ))}
            </div>
          ) : (
            <p className="text-center text-secondary">No trending data available</p>
          )}
        </div>
      </section>
    </div>
  )
}
