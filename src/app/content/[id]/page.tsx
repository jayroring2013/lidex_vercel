'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Star, Heart, Calendar, BookOpen, Info, Tags, 
  ExternalLink, Share2, Copy, Twitter, Loader2,
  ArrowLeft, Award, TrendingUp, Globe, Users, ChevronDown, ChevronUp
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
        console.error('Failed to load:', err)
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

  // Format synopsis with line breaks
  const formatSynopsis = (text: string) => {
    if (!text) return 'No description available.'
    return text.split(/(?<=[.!?])\s+/).map((sentence, i) => (
      <p key={i} className="mb-2 last:mb-0">{sentence}</p>
    ))
  }

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-50 dark:bg-dark-900">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
      </div>
    )
  }

  // Error State
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
      {/* ✅ Hero Banner - Fixed Navbar Overlap */}
      <div className="relative pt-20 sm:pt-0">
        {/* Background Image */}
        <div className="absolute inset-0 h-[400px] sm:h-[450px] md:h-[550px]">
          {bannerImage ? (
            <>
              <img 
                src={bannerImage} 
                alt="" 
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 backdrop-blur-lg bg-light-900/70 dark:bg-dark-900/70" />
              <div className="absolute inset-0 bg-gradient-to-t from-light-50 dark:from-dark-900 via-light-900/50 dark:via-dark-900/50 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600" />
              <div className="absolute inset-0 bg-gradient-to-t from-light-50 dark:from-dark-900 via-light-900/50 dark:via-dark-900/50 to-transparent" />
            </>
          )}
        </div>
        
        {/* Content - With Top Padding for Navbar */}
        <div className="relative max-w-5xl mx-auto px-4">
          <div className="flex flex-col items-center pt-24 sm:pt-12 pb-8">
            {/* Cover Image */}
            <div className="mb-4 sm:mb-6">
              <div className="w-40 sm:w-48 md:w-56 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-light-200 dark:bg-dark-800">
                {coverImage ? (
                  <img 
                    src={coverImage} 
                    alt={series.title} 
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      setImageError(true)
                      e.currentTarget.style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent) {
                        parent.className = 'w-full h-56 sm:h-64 md:h-72 bg-gradient-to-br from-primary-600 to-purple-700 flex items-center justify-center'
                        parent.innerHTML = '<svg class="w-20 h-20 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>'
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-56 sm:h-64 md:h-72 bg-gradient-to-br from-primary-600 to-purple-700 flex items-center justify-center">
                    <BookOpen className="w-20 h-20 text-white/50" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Title & Info - Centered */}
            <div className="text-center w-full">
              {/* Type & Status Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                <span className="px-4 py-1.5 bg-primary-500 rounded-full text-xs font-semibold text-white">
                  {typeText}
                </span>
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold text-white ${
                  series.status === 'ongoing' || series.status === 'Ongoing' 
                    ? 'bg-green-500' 
                    : 'bg-blue-500'
                }`}>
                  {series.status || 'Unknown'}
                </span>
                {series.is_featured && (
                  <span className="px-4 py-1.5 bg-yellow-500 rounded-full text-xs font-semibold text-white flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    Featured
                  </span>
                )}
              </div>
              
              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-light-900 dark:text-white mb-3 leading-tight px-2">
                {series.title}
              </h1>
              
              {/* Alternative Titles */}
              {(series.title_vi || series.title_native) && (
                <div className="mb-4 px-4">
                  {series.title_vi && (
                    <p className="text-sm sm:text-base text-light-700 dark:text-gray-300 mb-1">{series.title_vi}</p>
                  )}
                  {series.title_native && (
                    <p className="text-xs sm:text-sm text-light-600 dark:text-gray-400">{series.title_native}</p>
                  )}
                </div>
              )}
              
              {/* Stats Row */}
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-lg font-bold text-light-900 dark:text-white">{series.score || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <span className="text-lg text-light-900 dark:text-white">{voteCount.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Author/Studio */}
              {(series.author || series.studio || series.publisher) && (
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-light-700 dark:text-gray-300 mb-4 px-4">
                {series.author && <span>{series.author}</span>}
                {series.studio && <span>• {series.studio}</span>}
                {series.publisher && <span>• {series.publisher}</span>}
              </div>
              )}

              {/* ✅ Synopsis - Integrated on Mobile, Separate Card on Desktop */}
              <div className="mt-6 text-left">
                <div className="sm:hidden">
                  {/* Mobile: Inline Synopsis */}
                  <div className="bg-white/50 dark:bg-dark-800/50 backdrop-blur-sm rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <BookOpen className="w-4 h-4 text-primary-500" />
                      <h3 className="text-sm font-bold text-light-900 dark:text-white">Synopsis</h3>
                    </div>
                    <div className="relative">
                      <div 
                        className={`text-light-700 dark:text-secondary leading-relaxed text-sm transition-all ${
                          synopsisExpanded ? '' : 'line-clamp-3'
                        }`}
                      >
                        {formatSynopsis(series.description || series.description_vi || '')}
                      </div>
                      {!synopsisExpanded && (series.description || series.description_vi) && (
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-light-50/80 dark:from-dark-800/80 to-transparent pointer-events-none" />
                      )}
                    </div>
                    {(series.description || series.description_vi) && (
                      <button
                        onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                        className="mt-2 flex items-center space-x-1 text-primary-500 hover:text-primary-600 text-xs font-medium transition-colors"
                      >
                        <span>{synopsisExpanded ? 'Less' : 'More'}</span>
                        {synopsisExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        
        {/* Synopsis - Desktop Only (separate card) */}
        <div className="hidden sm:block bg-white dark:bg-dark-800 rounded-2xl p-5 shadow-sm border border-light-200 dark:border-dark-700">
          <div className="flex items-center space-x-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-light-900 dark:text-white">Synopsis</h2>
          </div>
          <div className="relative">
            <div 
              className={`text-light-700 dark:text-secondary leading-relaxed text-sm sm:text-base transition-all ${
                synopsisExpanded ? '' : 'line-clamp-4 sm:line-clamp-5'
              }`}
            >
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
              {synopsisExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Radar Chart (Anime Only) */}
        {series.item_type === 'anime' && series.anime_meta && (
          <RadarChart series={series} />
        )}
        
        {/* Genres & Tags */}
        {(series.genres?.length > 0 || series.tags?.length > 0) && (
          <div className="bg-white dark:bg-dark-800 rounded-2xl p-5 shadow-sm border border-light-200 dark:border-dark-700">
            <div className="flex items-center space-x-2 mb-4">
              <Tags className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-bold text-light-900 dark:text-white">Tags</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {series.genres?.map((genre: string, i: number) => (
                <span 
                  key={`genre-${i}`}
                  className="px-3 py-1.5 bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs sm:text-sm font-medium"
                >
                  {genre}
                </span>
              ))}
              {series.tags?.map((tag: string, i: number) => (
                <span 
                  key={`tag-${i}`}
                  className="px-3 py-1.5 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-secondary rounded-lg text-xs sm:text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Information Grid */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl p-5 shadow-sm border border-light-200 dark:border-dark-700">
          <div className="flex items-center space-x-2 mb-5">
            <Info className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg
