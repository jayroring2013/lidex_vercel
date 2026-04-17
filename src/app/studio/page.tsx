'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Loader2, Grid3X3 } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { useLocale } from '@/contexts/LocaleContext'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface GenreAggregate {
  genre: string
  count: number
  avgScore: number
}

export default function GenreMatrixPage() {
  const { locale } = useLocale()
  const vi = locale === 'vi'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [genreRows, setGenreRows] = useState<GenreAggregate[]>([])
  const [minTitles, setMinTitles] = useState(5)

  useEffect(() => {
    async function loadGenreStats() {
      setLoading(true)
      setError(null)

      const { data, error: qErr } = await supabase
        .from('series')
        .select('genres, anime_meta!inner(mean_score)')
        .eq('item_type', 'anime')
        .not('anime_meta.mean_score', 'is', null)
        .not('genres', 'cs', '{"Hentai"}')
        .limit(5000)

      if (qErr) {
        setError(qErr.message)
        setLoading(false)
        return
      }

      const grouped = new Map<string, { sum: number; count: number }>()

      ;(data || []).forEach((row: any) => {
        const meta = Array.isArray(row.anime_meta) ? row.anime_meta[0] : row.anime_meta
        const meanScore = meta?.mean_score
        const genres = Array.isArray(row.genres) ? row.genres : []

        if (typeof meanScore !== 'number' || genres.length === 0) return

        genres.forEach((g: string) => {
          const genre = (g || '').trim()
          if (!genre) return

          const curr = grouped.get(genre) || { sum: 0, count: 0 }
          curr.sum += meanScore
          curr.count += 1
          grouped.set(genre, curr)
        })
      })

      const aggregated: GenreAggregate[] = Array.from(grouped.entries()).map(([genre, v]) => ({
        genre,
        count: v.count,
        avgScore: Number((v.sum / v.count).toFixed(2)),
      }))

      setGenreRows(aggregated)
      setLoading(false)
    }

    loadGenreStats()
  }, [])

  const topGenres = useMemo(() => {
    return [...genreRows]
      .filter(g => g.count >= minTitles)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 15)
  }, [genreRows, minTitles])

  const chartData = useMemo(() => ({
    labels: topGenres.map(g => g.genre),
    datasets: [
      {
        label: vi ? 'Điểm trung bình' : 'Average mean_score',
        data: topGenres.map(g => g.avgScore),
        backgroundColor: 'rgba(236, 72, 153, 0.75)',
        borderColor: 'rgba(236, 72, 153, 1)',
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  }), [topGenres, vi])

  const chartOptions = useMemo<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const row = topGenres[ctx.dataIndex]
            return vi
              ? `Điểm TB: ${ctx.parsed.x} · ${row?.count ?? 0} tựa`
              : `Avg: ${ctx.parsed.x} · ${row?.count ?? 0} titles`
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: vi ? 'Trung bình anime_meta.mean_score' : 'Average anime_meta.mean_score',
        },
      },
      y: {
        ticks: { autoSkip: false },
      },
    },
  }), [topGenres, vi])

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Grid3X3 className="w-7 h-7 text-pink-500" />
            {vi ? 'Ma trận độ phổ biến thể loại' : 'Genre Popularity Matrix'}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            {vi
              ? 'Đối chiếu series.genres[] với anime_meta.mean_score để xem thể loại nào có điểm trung bình cao nhất.'
              : 'Cross-reference series.genres[] with anime_meta.mean_score to see which genres score highest on average.'}
          </p>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 mb-5" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <label className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {vi ? 'Số tựa tối thiểu / thể loại' : 'Minimum titles per genre'}
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={minTitles}
              onChange={(e) => setMinTitles(Math.max(1, Number(e.target.value || 1)))}
              className="w-28 px-3 py-2 rounded-lg"
              style={{
                background: 'var(--background-secondary)',
                color: 'var(--foreground)',
                border: '1px solid var(--card-border)',
              }}
            />
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              {vi ? 'Mặc định 5+ để giảm nhiễu mẫu nhỏ.' : 'Default 5+ to reduce small-sample noise.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
          {loading ? (
            <div className="h-[520px] flex items-center justify-center">
              <div className="flex items-center gap-2" style={{ color: 'var(--foreground-secondary)' }}>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{vi ? 'Đang tải dữ liệu thể loại…' : 'Loading genre data…'}</span>
              </div>
            </div>
          ) : error ? (
            <div className="h-[520px] flex items-center justify-center text-center">
              <div>
                <p className="font-semibold text-red-400">{vi ? 'Không thể tải dữ liệu' : 'Failed to load data'}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--foreground-muted)' }}>{error}</p>
              </div>
            </div>
          ) : topGenres.length === 0 ? (
            <div className="h-[520px] flex items-center justify-center text-center">
              <p style={{ color: 'var(--foreground-secondary)' }}>
                {vi ? 'Không có thể loại nào thỏa bộ lọc hiện tại.' : 'No genres match the current filter.'}
              </p>
            </div>
          ) : (
            <>
              <div className="h-[520px]">
                <Bar data={chartData} options={chartOptions} />
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: 'var(--foreground-secondary)' }}>
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">{vi ? 'Thể loại' : 'Genre'}</th>
                      <th className="text-right py-2">{vi ? 'Số tựa' : 'Titles'}</th>
                      <th className="text-right py-2">{vi ? 'Điểm TB' : 'Avg Score'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topGenres.map((g, idx) => (
                      <tr key={g.genre} style={{ borderTop: '1px solid var(--card-border)' }}>
                        <td className="py-2">{idx + 1}</td>
                        <td className="py-2 font-medium" style={{ color: 'var(--foreground)' }}>{g.genre}</td>
                        <td className="py-2 text-right">{g.count}</td>
                        <td className="py-2 text-right">{g.avgScore.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
