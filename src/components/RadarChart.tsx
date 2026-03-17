'use client'

import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { Tv, Clock, TrendingUp, Users, Heart, Calendar, Award } from 'lucide-react'
import { usePopularityStats } from '@/hooks/usePopularityStats'
import { useEffect, useState } from 'react'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

interface RadarChartProps {
  series: any
}

export default function RadarChart({ series }: RadarChartProps) {
  const { stats: popularityStats, loading } = usePopularityStats()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  if (series.item_type !== 'anime') return null

  const anime_meta = series.anime_meta || {}
  const popularityScore = calculatePopularityScore(anime_meta.popularity, popularityStats)

  const labelColor     = isDark ? 'rgba(148,163,184,1)'   : 'rgba(71,85,105,1)'
  const gridColor      = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.15)'
  const angleLineColor = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)'

  const data = {
    labels: ['Score', 'Popularity', 'Episodes', 'Duration', 'Favorites', 'Completion'],
    datasets: [{
      label: series.title,
      data: [
        anime_meta.mean_score   ? anime_meta.mean_score / 10                                     : 0,
        popularityScore,
        anime_meta.episodes     ? Math.min(10, anime_meta.episodes / 50 * 10)                   : 5,
        anime_meta.duration_min ? Math.min(10, anime_meta.duration_min / 30 * 10)               : 5,
        anime_meta.favourites   ? Math.min(10, Math.log10(anime_meta.favourites + 1) * 2.5)     : 5,
        anime_meta.end_date     ? 10 : anime_meta.start_date ? 5 : 0,
      ],
      backgroundColor: 'rgba(99,102,241,0.15)',
      borderColor:     'rgba(99,102,241,0.8)',
      borderWidth: 2,
      pointBackgroundColor:    'rgba(99,102,241,1)',
      pointBorderColor:        isDark ? '#1e293b' : '#ffffff',
      pointHoverBackgroundColor: isDark ? '#fff' : '#4f46e5',
      pointHoverBorderColor:   'rgba(99,102,241,1)',
    }],
  }

  const options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: angleLineColor },
        grid:       { color: gridColor },
        pointLabels: { color: labelColor, font: { size: 12, weight: 600 as any } },
        ticks: { display: false, stepSize: 2 },
        suggestedMin: 0,
        suggestedMax: 10,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${(ctx.parsed.r || 0).toFixed(1)}/10`,
        },
      },
    },
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 md:p-8">
        <div className="flex items-center space-x-2 mb-6">
          <TrendingUp className="w-6 h-6 text-primary-500" />
          <h3 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Statistics Overview</h3>
        </div>
        <div className="h-64 md:h-80 flex items-center justify-center">
          <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Loading stats…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-6 h-6 text-primary-500" />
          <h3 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Statistics Overview</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          <span className="w-3 h-3 rounded-full bg-primary-500" />
          <span>Rating</span>
        </div>
      </div>

      {/* Radar */}
      <div className="h-64 md:h-80">
        <Radar data={data} options={options} />
      </div>

      {/* Stat grid */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6 pt-6"
        style={{ borderTop: '1px solid var(--card-border)' }}
      >
        <StatItem icon={Tv}       label="Episodes"         value={anime_meta.episodes || 'N/A'} />
        <StatItem icon={Clock}    label="Duration"         value={anime_meta.duration_min ? `${anime_meta.duration_min} min` : 'N/A'} />
        <StatItem icon={Calendar} label="Season"           value={anime_meta.season ? `${anime_meta.season.toUpperCase()} ${anime_meta.season_year || ''}` : 'N/A'} />
        <StatItem icon={Users}    label="Popularity Score" value={anime_meta.popularity ? anime_meta.popularity.toLocaleString() : 'N/A'} />
        <StatItem icon={Heart}    label="Favorites"        value={anime_meta.favourites ? formatNumber(anime_meta.favourites) : 'N/A'} />
        <StatItem icon={Award}    label="Mean Score"       value={anime_meta.mean_score ? `${anime_meta.mean_score}/100` : 'N/A'} />
      </div>
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────

interface PopularityStats {
  min: number; max: number
  p50: number; p75: number; p90: number; p95: number; p99: number
}

function calculatePopularityScore(popularity: number | null | undefined, stats: PopularityStats | null): number {
  if (!popularity || !stats) return 5
  const { min, max, p50, p75, p90, p95, p99 } = stats
  if (popularity <= min) return 0
  if (popularity <= p50) return 2.5 + ((popularity - min)  / (p50 - min))  * 2.5
  if (popularity <= p75) return 5.0 + ((popularity - p50)  / (p75 - p50))  * 1.5
  if (popularity <= p90) return 6.5 + ((popularity - p75)  / (p90 - p75))  * 1.5
  if (popularity <= p95) return 8.0 + ((popularity - p90)  / (p95 - p90))  * 1.0
  if (popularity <= p99) return 9.0 + ((popularity - p95)  / (p99 - p95))  * 0.5
  return 9.5 + ((popularity - p99) / (max - p99)) * 0.5
}

function StatItem({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div
      className="flex items-center space-x-3 p-3 rounded-lg"
      style={{ background: 'var(--background-secondary)', border: '1px solid var(--card-border)' }}
    >
      <Icon className="w-5 h-5 text-primary-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs mb-0.5 truncate" style={{ color: 'var(--foreground-muted)' }}>{label}</div>
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{value}</div>
      </div>
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K'
  return num.toString()
}
