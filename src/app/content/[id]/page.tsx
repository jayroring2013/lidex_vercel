'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Star, Heart, Calendar, BookOpen, Info, Tags,
  ExternalLink, Share2, Copy, Twitter, Loader2,
  ArrowLeft, Award, TrendingUp, Globe, ChevronDown, ChevronUp
} from 'lucide-react'
import { fetchSeries, fetchVoteCount } from '@/lib/api'
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

  const seriesId   = params.id ? parseInt(params.id as string) : undefined
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

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0">

            {/* Synopsis */}
            <div className="glass rounded-2xl p-5 sm:p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--foreground)' }}>Synopsis</h2>
              </div>
              <div className="relative">
                <div
                  className={`leading-relaxed text-sm sm:text-base md:text-lg ${synopsisExpanded ? '' : 'line-clamp-4 md:line-clamp-5'}`}
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  {formatSynopsis(series.description || series.description_vi || '')}
                </div>
                {!synopsisExpanded && (series.description || series.description_vi) && (
                  <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
                    style={{ background: 'linear-gradient(to top, var(--glass-bg), transparent)' }} />
                )}
              </div>
              {(series.description || series.description_vi) && (
                <button
                  onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                  className="mt-3 flex items-center space-x-1 text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors"
                >
                  <span>{synopsisExpanded ? 'Less' : 'More'}</span>
                  {synopsisExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Radar Chart */}
            {series.item_type === 'anime' && series.anime_meta && (
              <RadarChart series={series} />
            )}

            {/* Information Grid */}
            <div className="glass rounded-2xl p-5 sm:p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-5 sm:mb-6">
                <Info className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--foreground)' }}>Information</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <InfoItem icon={BookOpen}   label="Type"        value={typeText} />
                <InfoItem icon={Calendar}   label="Status"      value={(series.status || '--').toUpperCase()} />
                <InfoItem icon={Globe}      label="Source"      value={series.source || 'Manual'} />
                <InfoItem icon={BookOpen}   label="Author"      value={series.author || '--'} />
                <InfoItem icon={Award}      label="Publisher"   value={series.publisher || '--'} />
                <InfoItem icon={TrendingUp} label="External ID" value={series.external_id || '--'} />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 sm:space-y-6 min-w-0">

            {/* Tags */}
            {series.tags && series.tags.length > 0 && (
              <div className="glass rounded-2xl p-5 sm:p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Tags className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
                  <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--foreground)' }}>Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {series.tags.map((tag: string, i: number) => (
                    <span key={`tag-${i}`} className="px-2.5 py-1 rounded-lg text-xs sm:text-sm transition-colors cursor-pointer"
                      style={{ background: 'var(--background-secondary)', color: 'var(--foreground-secondary)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--foreground)' }}>Share</h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <button onClick={handleShare} className="p-2.5 sm:p-3 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-colors"
                  style={{ background: 'var(--background-secondary)', color: 'var(--foreground-secondary)', border: '1px solid var(--card-border)' }}>
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium truncate">{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
                <button onClick={handleShareTwitter} className="p-2.5 sm:p-3 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-colors hover:text-[#1d9bf0]"
                  style={{ background: 'var(--background-secondary)', color: 'var(--foreground-secondary)', border: '1px solid var(--card-border)' }}>
                  <Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">Twitter</span>
                </button>
              </div>
            </div>

            {/* External Links */}
            <div className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--foreground)' }}>External Links</h3>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                <a href={`https://anilist.co/search/${series.item_type || 'anime'}?search=${encodeURIComponent(series.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg transition-colors group"
                  style={{ background: 'var(--background-secondary)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#02a9ff] flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium truncate group-hover:text-primary-500 transition-colors" style={{ color: 'var(--foreground-secondary)' }}>AniList</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ml-2 group-hover:text-primary-500 transition-colors" style={{ color: 'var(--foreground-muted)' }} />
                </a>
                <a href={`https://myanimelist.net/search.php?q=${encodeURIComponent(series.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg transition-colors group"
                  style={{ background: 'var(--background-secondary)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#2e51a2] flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium truncate group-hover:text-primary-500 transition-colors" style={{ color: 'var(--foreground-secondary)' }}>MyAnimeList</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ml-2 group-hover:text-primary-500 transition-colors" style={{ color: 'var(--foreground-muted)' }} />
                </a>
              </div>
            </div>

            {/* Last Updated */}
            <div className="glass rounded-2xl p-5 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ color: 'var(--foreground)' }}>Updated</h3>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  {new Date(series.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
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
