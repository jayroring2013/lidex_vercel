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

export default function ContentDetail() {
  const params = useParams()
  const [series, setSeries] = useState<any>(null)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const seriesId = params.id ? parseInt(params.id as string) : undefined
  const coverImage = !imageError && series?.cover_url ? series.cover_url : null
  const bannerImage = series?.banner_url || series?.cover_url

  useEffect(() => {
    async function loadData() {
      if (!seriesId) { setError('No series ID provided'); setLoading(false); return }
      try {
        const data = await fetchSeries(seriesId)
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

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Check out "${series?.title}" on LiDex Analytics!`)
    const url = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const formatSynopsis = (text: string) => {
    if (!text) return <p className="text-gray-400 dark:text-gray-500 italic">No description available.</p>
    const cleanText = text.replace(/<br\s*\/?>/gi, '\n\n')
    return cleanText.split(/\n\n+/).map((paragraph, i) => (
      <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading series…</p>
        </div>
      </div>
    )
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <ArrowLeft className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Series Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || "The series you're looking for doesn't exist."}</p>
          <Link href="/dashboard" className="btn-primary inline-flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" /><span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    )
  }

  const typeText = (series.item_type || 'Series').replace('_', ' ').toUpperCase()
  const isOngoing = series.status === 'ongoing' || series.status === 'Ongoing'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 overflow-x-hidden">

      {/* ── Hero Banner ──
          KEY FIX: the hero is a self-contained block with its own padding that
          pushes content down. The background image sits inside it via
          absolute inset-0 — so its height naturally matches the content height.
          No more fixed h-[Xpx] on the background that mismatches the parent.
      */}
      <div className="relative w-full overflow-hidden">

        {/* Background fills the whole hero block */}
        <div className="absolute inset-0">
          {bannerImage ? (
            <>
              <img
                src={bannerImage} alt=""
                className="w-full h-full object-cover object-center"
                onError={() => setImageError(true)}
              />
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

        {/* Hero content — drives the height of the section via padding */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-8 pt-24 sm:pt-28 pb-10 sm:pb-14">

            {/* Cover */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-36 sm:w-44 md:w-52 lg:w-60 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-dark-800">
                {coverImage ? (
                  <img
                    src={coverImage} alt={series.title}
                    className="w-full h-auto block"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-52 sm:h-64 bg-gradient-to-br from-primary-600 to-purple-700 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 sm:w-20 sm:h-20 text-white/50" />
                  </div>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex-1 min-w-0 text-center md:text-left">

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                <span className="px-3 py-1 bg-primary-500/90 rounded-full text-xs font-semibold text-white whitespace-nowrap">
                  {typeText}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap ${isOngoing ? 'bg-green-500/90' : 'bg-blue-500/90'}`}>
                  {(series.status || 'Unknown').toUpperCase()}
                </span>
                {series.is_featured && (
                  <span className="px-3 py-1 bg-yellow-500/90 rounded-full text-xs font-semibold text-white flex items-center gap-1 whitespace-nowrap">
                    <Award className="w-3 h-3" /> Featured
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight break-words">
                {series.title}
              </h1>

              {/* Alt titles */}
              {(series.title_vi || series.title_native) && (
                <div className="mb-3">
                  {series.title_vi     && <p className="text-base sm:text-lg text-gray-300 mb-0.5 break-words">{series.title_vi}</p>}
                  {series.title_native && <p className="text-sm sm:text-base text-gray-400 break-words">{series.title_native}</p>}
                </div>
              )}

              {/* Stats */}
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

              {/* Studio / Publisher / Author */}
              {(series.author || series.studio || series.publisher) && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-300 mb-4">
                  {series.author    && <span><span className="text-gray-500 mr-1">Author</span><span className="break-words">{series.author}</span></span>}
                  {series.studio    && <span><span className="text-gray-500 mr-1">Studio</span><span className="break-words">{series.studio}</span></span>}
                  {series.publisher && <span><span className="text-gray-500 mr-1">Publisher</span><span className="break-words">{series.publisher}</span></span>}
                </div>
              )}

              {/* Genres */}
              {series.genres && series.genres.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
                  {series.genres.slice(0, 6).map((genre: string, i: number) => (
                    <span
                      key={`genre-${i}`}
                      className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white hover:bg-white/30 transition-colors whitespace-nowrap"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* ── END Hero ── */}

      {/* ── Main Content — sits below the hero in normal document flow ── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 items-start">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0">

            {/* Synopsis */}
            <div className="bg-white dark:glass rounded-2xl p-5 sm:p-6 md:p-8 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Synopsis</h2>
              </div>
              <div className="relative">
                <div className={`text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base md:text-lg ${synopsisExpanded ? '' : 'line-clamp-4 md:line-clamp-5'}`}>
                  {formatSynopsis(series.description || series.description_vi || '')}
                </div>
                {!synopsisExpanded && (series.description || series.description_vi) && (
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white dark:from-dark-900 to-transparent pointer-events-none" />
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
            <div className="bg-white dark:glass rounded-2xl p-5 sm:p-6 md:p-8 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
              <div className="flex items-center space-x-2 mb-5 sm:mb-6">
                <Info className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Information</h2>
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
              <div className="bg-white dark:glass rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
                <div className="flex items-center space-x-2 mb-4">
                  <Tags className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {series.tags.map((tag: string, i: number) => (
                    <span key={`tag-${i}`} className="px-2.5 py-1 bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors cursor-pointer">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="bg-white dark:glass rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
              <div className="flex items-center space-x-2 mb-4">
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Share</h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  onClick={handleShare}
                  className="p-2.5 sm:p-3 bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-colors text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-transparent"
                >
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium truncate">{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={handleShareTwitter}
                  className="p-2.5 sm:p-3 bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-colors text-gray-700 dark:text-gray-300 hover:text-[#1d9bf0] border border-gray-200 dark:border-transparent"
                >
                  <Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">Twitter</span>
                </button>
              </div>
            </div>

            {/* External Links */}
            <div className="bg-white dark:glass rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
              <div className="flex items-center space-x-2 mb-4">
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">External Links</h3>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                <a
                  href={`https://anilist.co/search/${series.item_type || 'anime'}?search=${encodeURIComponent(series.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-lg transition-colors group border border-gray-200 dark:border-transparent"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#02a9ff] flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white font-medium truncate">AniList</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500 group-hover:text-primary-500 flex-shrink-0 ml-2" />
                </a>
                <a
                  href={`https://myanimelist.net/search.php?q=${encodeURIComponent(series.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-lg transition-colors group border border-gray-200 dark:border-transparent"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#2e51a2] flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white font-medium truncate">MyAnimeList</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500 group-hover:text-primary-500 flex-shrink-0 ml-2" />
                </a>
              </div>
            </div>

            {/* Last Updated */}
            <div className="bg-white dark:glass rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Updated</h3>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
    <div className="p-2.5 sm:p-3 bg-gray-100 dark:bg-dark-800/50 rounded-lg border border-gray-200 dark:border-transparent">
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
        <span className="text-[0.65rem] sm:text-xs truncate">{label}</span>
      </div>
      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</p>
    </div>
  )
}
