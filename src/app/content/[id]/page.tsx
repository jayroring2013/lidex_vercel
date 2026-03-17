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

  const seriesId = params.id ? parseInt(params.id as string) : undefined
  const coverImage = !imageError && series?.cover_url ? series.cover_url : null
  const bannerImage = series?.banner_url || series?.cover_url

  useEffect(() => {
    async function loadData() {
      if (!seriesId) {
        setError('No series ID provided')
        setLoading(false)
        return
      }

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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Link copied to clipboard!')
  }

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Check out "${series?.title}" on LiDex Analytics!`)
    const url = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  // ✅ Fix: Parse synopsis with proper line breaks
  const formatSynopsis = (text: string) => {
    if (!text) return 'No description available.'
    // Remove <br> tags and split by sentences
    const cleanText = text.replace(/<br\s*\/?>/gi, '\n\n')
    return cleanText.split(/\n\n+/).map((paragraph, i) => (
      <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-50 dark:bg-dark-900">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-light-50 dark:bg-dark-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <ArrowLeft className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-light-900 dark:text-white mb-4">Series Not Found</h1>
          <p className="text-light-600 dark:text-secondary mb-6">{error || 'The series you\'re looking for doesn\'t exist.'}</p>
          <Link href="/dashboard" className="btn-primary inline-flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    )
  }

  const typeText = (series.item_type || 'Series').replace('_', ' ').toUpperCase()

  return (
    <div className="min-h-screen bg-light-50 dark:bg-dark-900">
      {/* Hero Banner */}
      <div className="relative pt-16 sm:pt-0">
        {/* Background Image with Blur - INCREASED OPACITY */}
        <div className="absolute inset-0 h-[400px] sm:h-[500px] md:h-[600px] overflow-hidden">
          {bannerImage ? (
            <>
              <img
                src={bannerImage}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 backdrop-blur-xl bg-dark-900/80" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/90 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/90 to-transparent" />
            </>
          )}
        </div>

        {/* Content */}
        <div className="relative h-full max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end md:items-center gap-6 md:gap-8 pt-20 sm:pt-0 pb-8">
            {/* Cover Image */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-48 md:w-64 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-dark-800">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={series.title}
                    className="w-full h-auto"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-72 bg-gradient-to-br from-primary-600 to-purple-700 flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-white/50" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left pb-4">
              {/* ✅ REMOVED: Type & Status Badges */}

              {/* Title */}
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight">
                {series.title}
              </h1>

              {/* Alternative Titles */}
              {(series.title_vi || series.title_native) && (
                <div className="mb-4">
                  {series.title_vi && (
                    <p className="text-lg text-gray-300 mb-1">{series.title_vi}</p>
                  )}
                  {series.title_native && (
                    <p className="text-base text-gray-400">{series.title_native}</p>
                  )}
                </div>
              )}

              {/* Stats Row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mb-6">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-xl font-bold text-white">{series.score || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <span className="text-lg text-white">{voteCount.toLocaleString()}</span>
                </div>
              </div>

              {/* Author/Studio */}
              {(series.author || series.studio || series.publisher) && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-300 mb-6">
                  {series.author && (
                    <span className="flex items-center">
                      <span className="text-gray-400 mr-2">Author:</span>
                      {series.author}
                    </span>
                  )}
                  {series.studio && (
                    <span className="flex items-center">
                      <span className="text-gray-400 mr-2">Studio:</span>
                      {series.studio}
                    </span>
                  )}
                  {series.publisher && (
                    <span className="flex items-center">
                      <span className="text-gray-400 mr-2">Publisher:</span>
                      {series.publisher}
                    </span>
                  )}
                </div>
              )}

              {/* Genres Below Cover */}
              {series.genres && series.genres.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                  {series.genres.slice(0, 6).map((genre: string, i: number) => (
                    <span
                      key={`genre-${i}`}
                      className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white hover:bg-white/30 transition-colors"
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* ✅ Synopsis - Collapsible with Line Breaks */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 md:p-8 shadow-sm border border-light-200 dark:border-dark-700">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-light-900 dark:text-primary">Synopsis</h2>
              </div>
              <div className="relative">
                <div className={`text-light-700 dark:text-secondary leading-relaxed text-base md:text-lg ${
                  synopsisExpanded ? '' : 'line-clamp-4 md:line-clamp-5'
                }`}>
                  {formatSynopsis(series.description || series.description_vi || '')}
                </div>
                {!synopsisExpanded && (series.description || series.description_vi) && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-dark-800 to-transparent pointer-events-none" />
                )}
              </div>
              {(series.description || series.description_vi) && (
                <button
                  onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                  className="mt-3 flex items-center space-x-1 text-primary-500 hover:text-primary-600 text-sm font-medium transition-colors"
                >
                  <span>{synopsisExpanded ? 'Less' : 'More'}</span>
                  {synopsisExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Radar Chart (Anime Only) */}
            {series.item_type === 'anime' && series.anime_meta && (
              <RadarChart series={series} />
            )}

            {/* Information Grid */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 md:p-8 shadow-sm border border-light-200 dark:border-dark-700">
              <div className="flex items-center space-x-2 mb-6">
                <Info className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-light-900 dark:text-primary">Information</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <InfoItem icon={BookOpen} label="Type" value={typeText} />
                <InfoItem icon={Calendar} label="Status" value={series.status || '--'} />
                <InfoItem icon={Globe} label="Source" value={series.source || 'Manual'} />
                <InfoItem icon={BookOpen} label="Author" value={series.author || '--'} />
                <InfoItem icon={Award} label="Publisher" value={series.publisher || '--'} />
                <InfoItem icon={TrendingUp} label="External ID" value={series.external_id || '--'} />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            
            {/* Tags Box - Moved ABOVE Share */}
            {(series.tags && series.tags.length > 0) && (
              <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-light-200 dark:border-dark-700">
                <div className="flex items-center space-x-2 mb-4">
                  <Tags className="w-5 h-5 text-primary-500" />
                  <h3 className="text-lg font-bold text-light-900 dark:text-primary">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {series.tags.map((tag: string, i: number) => (
                    <span
                      key={`tag-${i}`}
                      className="px-3 py-1.5 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-secondary rounded-lg text-sm hover:bg-light-200 dark:hover:bg-dark-600 transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-light-200 dark:border-dark-700">
              <h3 className="text-lg font-bold text-light-900 dark:text-primary mb-4">Share</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShare}
                  className="p-3 bg-light-100 dark:bg-dark-700 hover:bg-light-200 dark:hover:bg-dark-600 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Copy className="w-5 h-5 text-light-700 dark:text-secondary" />
                  <span className="text-sm text-light-700 dark:text-secondary">Copy Link</span>
                </button>
                <button
                  onClick={handleShareTwitter}
                  className="p-3 bg-light-100 dark:bg-dark-700 hover:bg-light-200 dark:hover:bg-dark-600 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Twitter className="w-5 h-5 text-light-700 dark:text-secondary" />
                  <span className="text-sm text-light-700 dark:text-secondary">Twitter</span>
                </button>
              </div>
            </div>

            {/* External Links */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-light-200 dark:border-dark-700">
              <h3 className="text-lg font-bold text-light-900 dark:text-primary mb-4">External Links</h3>
              <div className="space-y-3">
                <a
                  href={`https://anilist.co/search/${series.item_type || 'anime'}?search=${encodeURIComponent(series.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-light-100 dark:bg-dark-700 hover:bg-light-200 dark:hover:bg-dark-600 rounded-lg transition-colors group"
                >
                  <span className="text-sm text-light-700 dark:text-secondary group-hover:text-primary-500 transition-colors">AniList</span>
                  <ExternalLink className="w-4 h-4 text-light-500 dark:text-secondary group-hover:text-primary-500 transition-colors" />
                </a>
                <a
                  href={`https://myanimelist.net/search.php?q=${encodeURIComponent(series.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-light-100 dark:bg-dark-700 hover:bg-light-200 dark:hover:bg-dark-600 rounded-lg transition-colors group"
                >
                  <span className="text-sm text-light-700 dark:text-secondary group-hover:text-primary-500 transition-colors">MyAnimeList</span>
                  <ExternalLink className="w-4 h-4 text-light-500 dark:text-secondary group-hover:text-primary-500 transition-colors" />
                </a>
              </div>
            </div>

            {/* Last Updated */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-light-200 dark:border-dark-700">
              <h3 className="text-lg font-bold text-light-900 dark:text-primary mb-4">Updated</h3>
              <div className="flex items-center space-x-3 text-light-700 dark:text-secondary">
                <Calendar className="w-5 h-5 text-primary-500" />
                <span className="text-sm">
                  {new Date(series.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
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

// Info Item Component
function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-3 bg-light-50 dark:bg-dark-700/50 rounded-lg">
      <div className="flex items-center space-x-2 text-light-500 dark:text-gray-400 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-light-900 dark:text-white">{value}</p>
    </div>
  )
}
