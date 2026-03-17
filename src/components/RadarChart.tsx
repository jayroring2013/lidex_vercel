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

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface RadarChartProps {
  series: any
}

export default function RadarChart({ series }: RadarChartProps) {
  // Only show for anime
  if (series.item_type !== 'anime') {
    return null
  }

  // Get anime-specific metadata
  const anime_meta = series.anime_meta || {}

  // Normalize data to 0-10 scale for radar chart
  const data = {
    labels: ['Score', 'Popularity', 'Episodes', 'Duration', 'Members', 'Favorites'],
    datasets: [
      {
        label: series.title,
        data: [
          // Score (0-10)
          parseFloat(series.score) || 0,
          
          // Popularity (1-10, inverted - lower is better)
          anime_meta.popularity ? Math.max(0, 10 - (anime_meta.popularity / 1000)) : 5,
          
          // Episodes (0-10 scale)
          anime_meta.episodes ? Math.min(10, anime_meta.episodes / 50 * 10) : 5,
          
          // Duration (0-10 scale, minutes)
          anime_meta.duration ? Math.min(10, anime_meta.duration / 30 * 10) : 5,
          
          // Members (0-10 scale)
          anime_meta.members ? Math.min(10, Math.log10(anime_meta.members + 1) * 2) : 5,
          
          // Favorites (0-10 scale)
          anime_meta.favorites ? Math.min(10, Math.log10(anime_meta.favorites + 1) * 2.5) : 5,
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
      },
    ],
  }

  const options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          color: 'rgba(148, 163, 184, 0.3)',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)',
        },
        pointLabels: {
          color: 'rgba(148, 163, 184, 1)',
          font: {
            size: 12,
            weight: '600',
          },
        },
        ticks: {
          display: false,
          stepSize: 2,
        },
        suggestedMin: 0,
        suggestedMax: 10,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed.r || 0
            return `${label}: ${value.toFixed(1)}/10`
          },
        },
      },
    },
  }

  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-primary">Statistics Overview</h3>
        <div className="flex items-center space-x-2 text-sm text-secondary">
          <span className="w-3 h-3 rounded-full bg-primary-500"></span>
          <span>Rating</span>
        </div>
      </div>
      
      <div className="h-64 md:h-80">
        <Radar data={data} options={options} />
      </div>

      {/* Stats Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-dark-700">
        <StatItem 
          label="Episodes" 
          value={anime_meta.episodes || 'N/A'} 
          icon="📺"
        />
        <StatItem 
          label="Duration" 
          value={anime_meta.duration ? `${anime_meta.duration} min` : 'N/A'} 
          icon="⏱️"
        />
        <StatItem 
          label="Status" 
          value={series.status || 'N/A'} 
          icon="📊"
        />
        <StatItem 
          label="Members" 
          value={anime_meta.members ? formatNumber(anime_meta.members) : 'N/A'} 
          icon="👥"
        />
        <StatItem 
          label="Favorites" 
          value={anime_meta.favorites ? formatNumber(anime_meta.favorites) : 'N/A'} 
          icon="❤️"
        />
        <StatItem 
          label="Popularity" 
          value={`#${anime_meta.popularity || 'N/A'}`} 
          icon="🔥"
        />
      </div>
    </div>
  )
}

// Stat Item Component
function StatItem({ label, value, icon }: { label: string, value: string | number, icon: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-secondary mb-1">{label}</div>
      <div className="text-sm font-semibold text-primary">{value}</div>
    </div>
  )
}

// Helper: Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}
