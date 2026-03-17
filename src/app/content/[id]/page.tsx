'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Star, Heart, Calendar, BookOpen, Info, Tags,
  ExternalLink, Share2, Copy, Twitter, Loader2,
  ArrowLeft, Bookmark, Book, Award, TrendingUp, Globe, ChevronDown, ChevronUp
} from 'lucide-react'
import { getSeriesById, getVoteCount, submitVote } from '../../../lib/supabase'

export default function ContentDetail() {
  const params = useParams()
  const [series, setSeries] = useState<any>(null)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!params.id) {
        setError('No series ID provided')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await getSeriesById(params.id)
        
        if (error || !data) {
          throw new Error(`Series with ID "${params.id}" not found`)
        }
        
        setSeries(data)
        const votes = await getVoteCount(params.id)
        setVoteCount(votes)
      } catch (err: any) {
        console.error('Failed to load series:', err)
        setError(err.message || 'Failed to load series')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [params.id])

  const handleVote = async () => {
    if (!params.id || voting) return
    setVoting(true)
    try {
      await submitVote(params.id)
      const newCount = await getVoteCount(params.id)
      setVoteCount(newCount)
    } catch (err: any) {
      alert('Failed to submit vote: ' + (err.message || 'Unknown error'))
    } finally {
      setVoting(false)
    }
  }

  const handleBookmark = () => {
    setBookmarked(!bookmarked)
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Link copied to clipboard!')
  }

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Check out "${series?.title}" on LiDex Analytics!`)
    const url = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const formatSynopsis = (text: string) => {
    if (!text) return 'No description available.'
    const cleanText = text.replace(/<br\s*\/?>/gi, '\n\n')
    return cleanText.split(/\n\n+/).map((paragraph, i) => (
      <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
    ))
  }

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    )
  }

  // Error State
  if (error || !series) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <ArrowLeft className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Series Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'The series you\'re looking for doesn\'t exist.'}</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Hero Banner */}
      <div className="relative pt-20 sm:pt-0">
        {/* Background Image with Blur */}
        <div className="absolute inset-0 h-[450px] sm:h-[550px] md:h-[650px] overflow-hidden">
          {series.cover_url ? (
            <>
              <img
                src={series.cover_url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 backdrop-blur-xl bg-dark-900/80" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-dark-900 via-dark-900/90 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-dark-900 via-dark-900/90 to-transparent" />
            </>
          )}
        </div>

        {/* Content */}
        <div className="relative h-full max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end md:items-center gap-6 md:gap-8 pt-24 sm:pt-20 pb-16">
            {/* Cover Image */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-48 md:w-64 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-dark-800">
                {series.cover_url ? (
                  <img
                    src={series.cover_url}
                    alt={series.title}
                    className="w-full h-auto"
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
              {/* Type & Status Badges - Status UPPERCASE */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                <span className="px-4 py-1.5 bg-primary-500/90 rounded-full text-xs font-semibold text-white">
                  {typeText}
                </span>
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold text-white ${
                  series.status === 'ongoing' || series.status === 'Ongoing'
                    ? 'bg-green-500/90'
                    : 'bg-blue-500/90'
                }`}>
                  {(series.status || 'Unknown').toUpperCase()}
                </span>
                {series.is_featured && (
                  <span className="px-4 py-1.5 bg-yellow-500/90 rounded-full text-xs font-semibold text-white flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    Featured
                  </span>
                )}
              </div>

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
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
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
      <div className="max-w-7xl mx-auto px-4 py-12 mt-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Synopsis - Collapsible */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-dark-700">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-primary">Synopsis</h2>
              </div>
              <div className="relative">
                <div className={`text-gray-700 dark:text-secondary leading-relaxed text-base md:text-lg ${
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

            {/* Information Grid */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-dark-700">
              <div className="flex items-center space-x-2 mb-6">
                <Info className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-primary">Information</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <InfoItem icon={BookOpen} label="Type" value={typeText} />
                <InfoItem icon={Calendar} label="Status" value={(series.status || '--').toUpperCase()} />
                <InfoItem icon={Globe} label="Source" value={series.source || 'Manual'} />
                <InfoItem icon={Book} label="Author" value={series.author || '--'} />
                <InfoItem icon={Award} label="Publisher" value={series.publisher || '--'} />
                <InfoItem icon={TrendingUp} label="External ID" value={series.external_id || '--'} />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            
            {/* Share */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-primary mb-4">Share</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShare}
                  className="p-3 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Copy className="w-5 h-5 text-gray-700 dark:text-secondary" />
                  <span className="text-sm text-gray-700 dark:text-secondary">Copy Link</span>
                </button>
                <button
                  onClick={handleShareTwitter}
                  className="p-3 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Twitter className="w-5 h-5 text-gray-700 dark:text-secondary" />
                  <span className="text-sm text-gray-700 dark:text-secondary">Twitter</span>
                </button>
              </div>
            </div>

            {/* External Links */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-primary mb-4">External Links</h3>
              <div className="space-y-3">
                <a
                  href={`https://anilist.co/search/${series.item_type || 'anime'}?search=${encodeURIComponent(series.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors group"
                >
                  <span className="text-sm text-gray-700 dark:text-secondary group-hover:text-primary-500 transition-colors">AniList</span>
                  <ExternalLink className="w-4 h-4 text-gray-500 dark:text-secondary group-hover:text-primary-500 transition-colors" />
                </a>
                <a
                  href={`https://myanimelist.net/search.php?q=${encodeURIComponent(series.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors group"
                >
                  <span className="text-sm text-gray-700 dark:text-secondary group-hover:text-primary-500 transition-colors">MyAnimeList</span>
                  <ExternalLink className="w-4 h-4 text-gray-500 dark:text-secondary group-hover:text-primary-500 transition-colors" />
                </a>
              </div>
            </div>

            {/* Last Updated */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-primary mb-4">Updated</h3>
              <div className="flex items-center space-x-3 text-gray-700 dark:text-secondary">
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
    <div className="p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
