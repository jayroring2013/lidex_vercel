'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Star, Heart, Calendar, BookOpen, Info, Tags,
  ExternalLink, Share2, Copy, Twitter, Loader2,
  ArrowLeft, Award, TrendingUp, Globe, ChevronDown, ChevronUp,
  BarChart2, FlaskConical, Users, Film, Layers
} from 'lucide-react'
import { fetchSeries, fetchVoteCount } from '@/lib/api'
import { useLocale } from '@/contexts/LocaleContext'
import RadarChart from '@/components/RadarChart'
import supabase from '@/lib/supabaseClient'
import {
  calculateLiDexScore,
  buildPopulationStats,
  type LiDexScoreBreakdown,
} from '@/lib/lidexScore'

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return '#4ade80'
  if (s >= 65) return '#86efac'
  if (s >= 50) return '#fbbf24'
  if (s >= 35) return '#fb923c'
  return '#f87171'
}

function scoreGrade(s: number) {
  if (s >= 85) return 'S'
  if (s >= 75) return 'A'
  if (s >= 60) return 'B'
  if (s >= 45) return 'C'
  if (s >= 30) return 'D'
  return 'F'
}

const COMPONENT_META: { key: keyof LiDexScoreBreakdown; label: string; weight: number }[] = [
  { key: 'community',        label: 'Community Score',   weight: 30 },
  { key: 'popularity',       label: 'Popularity',        weight: 18 },
  { key: 'favourites',       label: 'Favourites',        weight: 17 },
  { key: 'distribution',     label: 'Score Distribution',weight: 13 },
  { key: 'viewerEngagement', label: 'Viewer Engagement', weight: 12 },
  { key: 'animeStatus',      label: 'Status',            weight:  5 },
  { key: 'studio',           label: 'Studio Rep.',       weight:  5 },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContentDetail() {
  const params = useParams()
  const [series,      setSeries]      = useState<any>(null)
  const [voteCount,   setVoteCount]   = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [imageError,  setImageError]  = useState(false)
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [lidexScore,  setLidexScore]  = useState<LiDexScoreBreakdown | null>(null)
  const [scoreLoading,setScoreLoading]= useState(false)
  const [activeTab,   setActiveTab]   = useState<'info' | 'stats' | 'analyze'>('info')

  const { locale }  = useLocale()
  const isVI        = locale === 'vi'
  const seriesId    = params.id ? parseInt(params.id as string) : undefined
  const coverImage = !imageError && series?.cover_url ? series.cover_url : null
  const bannerImage = series?.banner_url || series?.cover_url

  // Load series + votes
  useEffect(() => {
    async function loadData() {
      if (!seriesId) { setError('No series ID provided'); setLoading(false); return }
      try {
        const data  = await fetchSeries(seriesId)
        setSeries(data)
        const votes = await fetchVoteCount(seriesId)
        setVoteCount(votes.count)
      } catch (err: any) {
        console.error('Failed to load series:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [seriesId])

  // Calculate LiDex Score once series is loaded (anime only)
  useEffect(() => {
    if (!series || series.item_type !== 'anime' || !series.anime_meta) return

    async function calcScore() {
      setScoreLoading(true)
      try {
        // Fetch population data for percentile baselines
        const { data: popData } = await supabase
          .from('anime_meta')
          .select('mean_score, popularity, favourites')
          .limit(3000)

        // Also fetch studio data for studio reputation component
        const { data: studioData } = await supabase
          .from('series')
          .select('studio, anime_meta(mean_score)')
          .eq('item_type', 'anime')
          .not('studio', 'is', null)
          .limit(3000)

        const studioRows = (studioData || []).map((s: any) => ({
          studio:     s.studio,
          mean_score: s.anime_meta?.mean_score ?? null,
          popularity: null,
          favourites: null,
        }))

        const allRows = [
          ...(popData || []).map((r: any) => ({ ...r, studio: null })),
          ...studioRows,
        ]

        const stats = buildPopulationStats(allRows)

        const breakdown = calculateLiDexScore(
          {
            mean_score:          series.anime_meta.mean_score,
            popularity:          series.anime_meta.popularity,
            favourites:          series.anime_meta.favourites,
            status:              series.status,
            score_distribution:  series.anime_meta.score_distribution,
            status_distribution: series.anime_meta.status_distribution,
          },
          series.studio ?? null,
          stats
        )
        setLidexScore(breakdown)
      } catch (e) {
        console.error('LiDex score calc failed:', e)
      } finally {
        setScoreLoading(false)
      }
    }
    calcScore()
  }, [series])

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Check out "${series?.title}" on LiDex Analytics!`)
    const url  = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const formatSynopsis = (text: string) => {
    if (!text) return <p style={{ color: 'var(--foreground-muted)', fontStyle: 'italic' }}>No description available.</p>
    const cleanText = text.replace(/<br\s*\/?>/gi, '\n\n')
    return cleanText.split(/\n\n+/).map((paragraph, i) => (
      <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-sm animate-pulse" style={{ color: 'var(--foreground-muted)' }}>Loading series…</p>
        </div>
      </div>
    )
  }

  if (error || !series) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
        <div className="text-center max-w-md">
          <ArrowLeft className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Series Not Found</h1>
          <p className="mb-6" style={{ color: 'var(--foreground-secondary)' }}>{error || "The series you're looking for doesn't exist."}</p>
          <Link href="/dashboard" className="btn-primary inline-flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" /><span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    )
  }

  const typeText = (series.item_type || 'Series').replace('_', ' ').toUpperCase()
  const isOngoing = series.status === 'ongoing' || series.status === 'Ongoing'
  const isAnime   = series.item_type === 'anime'

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--background)' }}>

      {/* ── Hero Banner ── */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute inset-0">
          {bannerImage ? (
            <>
              <img src={bannerImage} alt="" className="w-full h-full object-cover object-center" onError={() => setImageError(true)} />
              <div className="absolute inset-0 backdrop-blur-md bg-dark-900/55" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/50 to-transparent" />
            </>
          )}
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Outer row: cover | meta | score box */}
          <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-8 pt-24 sm:pt-28 pb-10 sm:pb-14">

            {/* Cover */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-36 sm:w-44 md:w-52 lg:w-60 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-dark-800">
                {coverImage ? (
                  <img src={coverImage} alt={series.title} className="w-full h-auto block" onError={() => setImageError(true)} />
                ) : (
                  <div className="w-full h-52 sm:h-64 bg-gradient-to-br from-primary-600 to-purple-700 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 sm:w-20 sm:h-20 text-white/50" />
                  </div>
                )}
              </div>
            </div>

            {/* Meta — flex-1 so it takes remaining space */}
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                <span className="px-3 py-1 bg-primary-500/90 rounded-full text-xs font-semibold text-white whitespace-nowrap">{typeText}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap ${isOngoing ? 'bg-green-500/90' : 'bg-blue-500/90'}`}>
                  {(series.status || 'Unknown').toUpperCase()}
                </span>
                {series.is_featured && (
                  <span className="px-3 py-1 bg-yellow-500/90 rounded-full text-xs font-semibold text-white flex items-center gap-1 whitespace-nowrap">
                    <Award className="w-3 h-3" /> Featured
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight break-words">
                {series.title}
              </h1>

              {(series.title_vi || series.title_native) && (
                <div className="mb-3">
                  {series.title_vi     && <p className="text-base sm:text-lg text-gray-300 mb-0.5 break-words">{series.title_vi}</p>}
                  {series.title_native && <p className="text-sm sm:text-base text-gray-400 break-words">{series.title_native}</p>}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 mb-4">
                {series.score && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-lg sm:text-xl font-bold text-white">{series.score}</span>
                    <span className="text-xs text-gray-400">/100</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span className="text-base sm:text-lg font-semibold text-white">{voteCount.toLocaleString()}</span>
                  <span className="text-xs text-gray-400">votes</span>
                </div>
              </div>

              {(series.author || series.studio || series.publisher) && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-300 mb-4">
                  {series.author    && <span><span className="text-gray-500 mr-1">Author</span><span className="break-words">{series.author}</span></span>}
                  {series.studio    && <span><span className="text-gray-500 mr-1">Studio</span><span className="break-words">{series.studio}</span></span>}
                  {series.publisher && <span><span className="text-gray-500 mr-1">Publisher</span><span className="break-words">{series.publisher}</span></span>}
                </div>
              )}

              {series.genres && series.genres.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
                  {series.genres.slice(0, 6).map((genre: string, i: number) => (
                    <span key={`genre-${i}`} className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white hover:bg-white/30 transition-colors whitespace-nowrap">
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* ── Synopsis in hero ── */}
              {(series.description || series.description_vi) && (
                <div className="mt-4 max-w-2xl">
                  <div className="relative">
                    <div className={`text-sm sm:text-base leading-relaxed text-gray-300 ${synopsisExpanded ? '' : 'line-clamp-3'}`}>
                      {formatSynopsis(series.description || series.description_vi || '')}
                    </div>
                    {!synopsisExpanded && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
                    )}
                  </div>
                  <button
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    {synopsisExpanded
                      ? <><ChevronUp   className="w-3.5 h-3.5" /> Thu gọn</>
                      : <><ChevronDown className="w-3.5 h-3.5" /> Xem thêm</>
                    }
                  </button>
                </div>
              )}
            </div>

            {/* ── LiDex Score Box — only for anime ── */}
            {isAnime && (
              <div className="flex-shrink-0 mx-auto md:mx-0 w-52 sm:w-56">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
                >
                  {/* Header */}
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <TrendingUp className="w-4 h-4 text-primary-400 flex-shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-300">LiDex Score</span>
                  </div>

                  <div className="p-4">
                    {scoreLoading ? (
                      <div className="flex flex-col items-center py-4 gap-2">
                        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                        <span className="text-xs text-gray-500">Calculating…</span>
                      </div>
                    ) : lidexScore ? (
                      <>
                        {/* Big score + grade */}
                        <div className="flex items-end justify-between mb-4">
                          <div>
                            <span
                              className="text-5xl font-black leading-none"
                              style={{ color: scoreColor(lidexScore.total) }}
                            >
                              {lidexScore.total.toFixed(1)}
                            </span>
                            <span className="text-gray-500 text-sm ml-1">/100</span>
                          </div>
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black"
                            style={{
                              background: `${scoreColor(lidexScore.total)}22`,
                              color:      scoreColor(lidexScore.total),
                              border:     `2px solid ${scoreColor(lidexScore.total)}66`,
                            }}
                          >
                            {scoreGrade(lidexScore.total)}
                          </div>
                        </div>

                        {/* Component bars */}
                        <div className="space-y-2">
                          {COMPONENT_META.map(({ key, label, weight }) => {
                            const val = lidexScore[key] as number
                            return (
                              <div key={key}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[0.65rem] text-gray-400 truncate flex-1">{label}</span>
                                  <span className="text-[0.65rem] font-bold ml-2 flex-shrink-0" style={{ color: scoreColor(val) }}>
                                    {val.toFixed(0)}
                                  </span>
                                </div>
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${val}%`, background: scoreColor(val) }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Weight note */}
                        <p className="text-[0.6rem] text-gray-600 text-center mt-3">
                          Composite of 7 signals
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4">Score unavailable</p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      {/* ── END Hero ── */}

      {/* ── Main Content ── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 items-start">

          {/* ── Left: Tabs ── */}
          <div className="lg:col-span-2 min-w-0">

            {/* Tab bar */}
            <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)' }}>
              {([
                { id: 'info',    labelVI: 'Thông tin chung', labelEN: 'General Info',  icon: Info         },
                { id: 'stats',   labelVI: 'Thông số',        labelEN: 'Stats',         icon: BarChart2    },
                { id: 'analyze', labelVI: 'Phân tích',       labelEN: 'Analysis',      icon: FlaskConical },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={activeTab === tab.id
                    ? { background: '#6366f1', color: '#fff', boxShadow: '0 2px 12px #6366f155' }
                    : { color: 'var(--foreground-secondary)' }}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:block">{isVI ? tab.labelVI : tab.labelEN}</span>
                </button>
              ))}
            </div>

            {/* ── Tab: Thông tin chung ── */}
            {activeTab === 'info' && (
              <div className="space-y-6 animate-in fade-in duration-200">

                {/* Info grid */}
                <div className="glass rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Info className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{isVI ? 'Thông tin'    : 'Information'}</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <InfoItem icon={Film}       label="Thể loại"     value={typeText} />
                    <InfoItem icon={Calendar}   label="Trạng thái"   value={(series.status || '--').toUpperCase()} />
                    <InfoItem icon={Globe}      label="Nguồn gốc"    value={series.source || 'Manual'} />
                    <InfoItem icon={BookOpen}   label="Tác giả"      value={series.author || '--'} />
                    <InfoItem icon={Award}      label="Nhà xuất bản" value={series.publisher || '--'} />
                    <InfoItem icon={Layers}     label="Studio"       value={series.studio || '--'} />
                    {series.anime_meta?.format      && <InfoItem icon={Film}      label="Format"     value={series.anime_meta.format} />}
                    {series.anime_meta?.season      && <InfoItem icon={Calendar}  label="Mùa"        value={`${series.anime_meta.season} ${series.anime_meta.season_year || ''}`} />}
                    {series.anime_meta?.episodes    && <InfoItem icon={Layers}    label="Số tập"     value={String(series.anime_meta.episodes)} />}
                    {series.anime_meta?.duration_min&& <InfoItem icon={TrendingUp}label="Thời lượng" value={`${series.anime_meta.duration_min} phút`} />}
                  </div>
                </div>

                {/* Tags */}
                {series.tags && series.tags.length > 0 && (
                  <div className="glass rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Tags className="w-5 h-5 text-primary-500 flex-shrink-0" />
                      <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Tags</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {series.tags.map((tag: string, i: number) => (
                        <span key={`tag-${i}`} className="px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                          style={{ background: 'var(--background-secondary)', color: 'var(--foreground-secondary)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Thông số ── */}
            {activeTab === 'stats' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {series.anime_meta ? (
                  <>
                    {/* Key stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatBig label="Điểm trung bình"  value={series.anime_meta.mean_score ? `${series.anime_meta.mean_score}` : '—'} sub="/100" color="#fbbf24" />
                      <StatBig label="Độ phổ biến"      value={series.anime_meta.popularity  ? series.anime_meta.popularity.toLocaleString()  : '—'} color="#6366f1" />
                      <StatBig label="Yêu thích"        value={series.anime_meta.favourites  ? fmtBig(series.anime_meta.favourites)  : '—'} color="#ec4899" />
                      <StatBig label="Lượt xem"         value={series.anime_meta.average_score ? `${series.anime_meta.average_score}` : voteCount.toLocaleString()} color="#22c55e" />
                    </div>

                    {/* Viewer status distribution */}
                    {series.anime_meta.status_distribution && (
                      <div className="glass rounded-2xl p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <Users className="w-5 h-5 text-primary-500" />
                          <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{isVI ? 'Phân phối người xem' : 'Viewer Distribution'}</h2>
                        </div>
                        <StatusDistribution data={series.anime_meta.status_distribution} />
                      </div>
                    )}

                    {/* Score distribution */}
                    {series.anime_meta.score_distribution && (
                      <div className="glass rounded-2xl p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <BarChart2 className="w-5 h-5 text-primary-500" />
                          <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{isVI ? 'Phân phối điểm' : 'Score Distribution'}</h2>
                        </div>
                        <ScoreDistribution data={series.anime_meta.score_distribution} />
                      </div>
                    )}

                    {/* Radar */}
                    <RadarChart series={series} />
                  </>
                ) : (
                  <div className="glass rounded-2xl p-10 flex flex-col items-center gap-3">
                    <BarChart2 className="w-10 h-10 opacity-20 text-primary-500" />
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Không có dữ liệu thống kê</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Phân tích ── */}
            {activeTab === 'analyze' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {isAnime && lidexScore ? (
                  <>
                    {/* Total score hero */}
                    <div className="glass rounded-2xl p-6 sm:p-8">
                      <div className="flex items-center gap-2 mb-6">
                        <FlaskConical className="w-5 h-5 text-primary-500" />
                        <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>LiDex Score — Phân tích tổng hợp</h2>
                      </div>

                      {/* Big score display */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                        <div className="flex items-end gap-3">
                          <span className="text-7xl font-black leading-none" style={{ color: scoreColor(lidexScore.total) }}>
                            {lidexScore.total.toFixed(1)}
                          </span>
                          <div className="pb-1">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black mb-1"
                              style={{ background: `${scoreColor(lidexScore.total)}18`, color: scoreColor(lidexScore.total), border: `2px solid ${scoreColor(lidexScore.total)}44` }}>
                              {scoreGrade(lidexScore.total)}
                            </div>
                            <p className="text-xs text-center" style={{ color: 'var(--foreground-muted)' }}>/100</p>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm mb-1 font-semibold" style={{ color: 'var(--foreground)' }}>Điểm tổng hợp LiDex</p>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
                            Dựa trên 7 chỉ số: điểm cộng đồng, độ phổ biến, yêu thích, phân phối điểm, mức độ tương tác người xem, trạng thái phát sóng và uy tín studio.
                          </p>
                        </div>
                      </div>

                      {/* Component breakdown */}
                      <div className="space-y-4">
                        {COMPONENT_META.map(({ key, label, weight }) => {
                          const val = lidexScore[key] as number
                          return (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{label}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'var(--background-secondary)', color: 'var(--foreground-muted)' }}>
                                    {weight}%
                                  </span>
                                </div>
                                <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor(val) }}>
                                  {val.toFixed(1)}
                                </span>
                              </div>
                              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--background-secondary)' }}>
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${val}%`, background: `linear-gradient(90deg, ${scoreColor(val)}, ${scoreColor(val)}bb)` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Methodology note */}
                    <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--background-secondary)', border: '1px solid var(--card-border)' }}>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                        <span className="font-bold" style={{ color: 'var(--foreground-secondary)' }}>Phương pháp:</span>{' '}
                        Điểm cộng đồng (30%) được chuẩn hóa theo phân vị so với toàn bộ cơ sở dữ liệu. Độ phổ biến (18%) và yêu thích (17%) đều được log-scale để tránh sai lệch. Phân phối điểm (13%) phân tích hệ số Gini và tỷ lệ điểm cao. Tương tác người xem (12%) tính từ tỷ lệ hoàn thành và bỏ xem. Studio (5%) dựa trên trung bình lịch sử.
                      </p>
                    </div>
                  </>
                ) : scoreLoading ? (
                  <div className="glass rounded-2xl p-10 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Đang tính toán điểm…</p>
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-10 flex flex-col items-center gap-3">
                    <FlaskConical className="w-10 h-10 opacity-20 text-primary-500" />
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      {isAnime ? 'Không có dữ liệu phân tích' : 'Phân tích chỉ khả dụng cho Anime'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right Sidebar (always visible) ── */}
          <div className="space-y-4 sm:space-y-5 min-w-0">

            {/* Share */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{isVI ? 'Chia sẻ'      : 'Share'}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleShare} className="p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs font-medium"
                  style={{ background: 'var(--background-secondary)', color: 'var(--foreground-secondary)', border: '1px solid var(--card-border)' }}>
                  <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                  {copied ? 'Đã chép!' : 'Sao chép'}
                </button>
                <button onClick={handleShareTwitter} className="p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs font-medium hover:text-[#1d9bf0]"
                  style={{ background: 'var(--background-secondary)', color: 'var(--foreground-secondary)', border: '1px solid var(--card-border)' }}>
                  <Twitter className="w-3.5 h-3.5 flex-shrink-0" />
                  Twitter
                </button>
              </div>
            </div>

            {/* External links */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ExternalLink className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{isVI ? 'Liên kết ngoài' : 'External Links'}</h3>
              </div>
              <div className="space-y-2">
                <a href={`https://anilist.co/search/${series.item_type || 'anime'}?search=${encodeURIComponent(series.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg group transition-colors"
                  style={{ background: 'var(--background-secondary)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#02a9ff]" />
                    <span className="text-xs font-medium group-hover:text-primary-500 transition-colors" style={{ color: 'var(--foreground-secondary)' }}>AniList</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:text-primary-500" style={{ color: 'var(--foreground-muted)' }} />
                </a>
                <a href={`https://myanimelist.net/search.php?q=${encodeURIComponent(series.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg group transition-colors"
                  style={{ background: 'var(--background-secondary)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2e51a2]" />
                    <span className="text-xs font-medium group-hover:text-primary-500 transition-colors" style={{ color: 'var(--foreground-secondary)' }}>MyAnimeList</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:text-primary-500" style={{ color: 'var(--foreground-muted)' }} />
                </a>
              </div>
            </div>

            {/* Last updated */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--foreground)' }}>{isVI ? 'Cập nhật lần cuối' : 'Last Updated'}</h3>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  {new Date(series.updated_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-2.5 sm:p-3 rounded-lg" style={{ background: 'var(--background-secondary)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--foreground-muted)' }}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
        <span className="text-[0.65rem] sm:text-xs truncate">{label}</span>
      </div>
      <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{value}</p>
    </div>
  )
}

function fmtBig(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function StatBig({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center" style={{ border: `1px solid ${color}30` }}>
      <p className="text-2xl sm:text-3xl font-black leading-none mb-0.5" style={{ color }}>
        {value}
        {sub && <span className="text-sm font-semibold ml-0.5" style={{ color: 'var(--foreground-muted)' }}>{sub}</span>}
      </p>
      <p className="text-[10px] sm:text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>{label}</p>
    </div>
  )
}

function StatusDistribution({ data }: { data: Record<string, number> | string }) {
  const parsed: Record<string, number> = typeof data === 'string' ? JSON.parse(data) : data
  const ORDER   = ['CURRENT', 'COMPLETED', 'PLANNING', 'PAUSED', 'DROPPED']
  const COLORS: Record<string, string> = {
    CURRENT:   '#6366f1',
    COMPLETED: '#22c55e',
    PLANNING:  '#fbbf24',
    PAUSED:    '#fb923c',
    DROPPED:   '#f87171',
  }
  const LABELS: Record<string, string> = {
    CURRENT: 'Đang xem', COMPLETED: 'Hoàn thành',
    PLANNING: 'Dự định',  PAUSED: 'Tạm dừng', DROPPED: 'Bỏ xem',
  }
  const total  = Object.values(parsed).reduce((s, v) => s + v, 0)
  if (!total) return null
  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {ORDER.filter(k => parsed[k]).map(k => (
          <div key={k} className="transition-all duration-700 rounded-full"
            style={{ width: `${(parsed[k] / total) * 100}%`, background: COLORS[k] }} />
        ))}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ORDER.filter(k => parsed[k]).map(k => (
          <div key={k} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--background-secondary)' }}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[k] }} />
            <div className="min-w-0">
              <p className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>{LABELS[k]}</p>
              <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>{fmtBig(parsed[k])}</p>
              <p className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>{((parsed[k] / total) * 100).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreDistribution({ data }: { data: Record<string, number> | string }) {
  const parsed: Record<string, number> = typeof data === 'string'
    ? (() => { try { return JSON.parse(data) } catch { return {} } })()
    : (data ?? {})
  const buckets   = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const counts    = buckets.map(b => Number(parsed[String(b)] ?? parsed[b] ?? 0))
  const maxCount  = Math.max(...counts, 1)
  const MAX_PX    = 96 // max bar height in pixels

  function barColor(score: number): string {
    if (score >= 80) return '#4ade80'
    if (score >= 60) return '#6366f1'
    if (score >= 40) return '#fbbf24'
    return '#f87171'
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: MAX_PX + 24 }}>
      {buckets.map((b, i) => {
        const barH = Math.max(Math.round((counts[i] / maxCount) * MAX_PX), counts[i] > 0 ? 3 : 0)
        return (
          <div key={b} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {/* Tooltip on hover */}
            <div className="group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <div style={{ position: 'relative', width: '100%', height: barH + 'px' }} className="group/bar">
                <div
                  style={{
                    width: '100%', height: '100%',
                    borderRadius: '4px 4px 0 0',
                    background: barColor(b),
                    opacity: counts[i] > 0 ? 1 : 0.12,
                    transition: 'height 0.6s ease',
                  }}
                />
                {counts[i] > 0 && (
                  <div
                    className="group/bar-hover"
                    style={{
                      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                      marginBottom: 4, pointerEvents: 'none', opacity: 0, transition: 'opacity 0.15s',
                      background: 'var(--glass-bg)', border: '1px solid var(--card-border)',
                      borderRadius: 6, padding: '2px 6px', fontSize: 10, fontWeight: 700,
                      color: 'var(--foreground)', whiteSpace: 'nowrap', zIndex: 10,
                    }}
                  >
                    {fmtBig(counts[i])}
                  </div>
                )}
              </div>
            </div>
            <span style={{ fontSize: 9, color: 'var(--foreground-muted)' }}>{b}</span>
          </div>
        )
      })}
    </div>
  )
}
