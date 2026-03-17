'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Star, Heart, Calendar, BookOpen, Info, Tags, 
  ExternalLink, Share2, Copy, Twitter, Loader2,
  ArrowLeft, Bookmark, Book, Award, TrendingUp, Globe, ChevronDown, ChevronUp
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
  const [bookmarked, setBookmarked] = useState(false)
  const [voting, setVoting] = useState(false)

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

  const handleVote = async () => {
    if (!seriesId || voting) return
    setVoting(true)
    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novel_id: seriesId }),
      })
      setVoteCount(prev => prev + 1)
    } catch (err: any) {
      alert('Failed to submit vote: ' + err.message)
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
    return text.split(/(?<=[.!?])\s+/).map((sentence, i) => (
      <p key={i} className="mb-2 last:mb-0">{sentence}</p>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-50 dark:bg-dark-900">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
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
      {/* ✅ Hero Banner - Desktop Layout Preserved */}
      <div className="relative pt-16 sm:pt-0">
        {/* Background Image with Blur */}
        <div className="absolute inset-0 h-[400px] sm:h-[500px] md:h-[600px]">
          {bannerImage ? (
            <>
              <img 
                src={bannerImage} 
                alt="" 
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 backdrop-blur-xl bg-dark-900/70" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent" />
            </>
          )}
        </div>
        
        {/* Content - FIXED: Added pt-20 on mobile to clear navbar */}
        <div className="relative h-full max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end md:items-center gap-6 md:gap-8 pt-20 sm:pt-0 pb-8">
            {/* Cover Image */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-40 sm:w-48 md:w-56 lg:w-64 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-dark-800">
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
                        parent.className = 'w-full h-64 sm:h-72 md:h-80 bg-gradient-to-br from-primary-600 to-purple-700 flex items-center justify-center'
                        parent.innerHTML = '<svg class="w-20 h-20 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>'
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-64 sm:h-72 md:h-80 bg-gradient-to-br from-primary-600 to-purple-700 flex items-center justify-center">
                    <BookOpen className="w-20 h-20 text-white/50" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Info - Desktop: Left aligned, Mobile: Centered */}
            <div className="flex-1 text-center md:text-left pb-4">
              {/* Type & Status Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                <span className="px-4 py-1.5 bg-primary-500/90 rounded-full text-xs font-semibold text-white">
                  {typeText}
                </span>
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold text-white ${
                  series.status === 'ongoing' || series.status === 'Ongoing' 
                    ? 'bg-green-500/90' 
                    : 'bg-blue-500/90'
                }`}>
                  {series.status || 'Unknown'}
                </span>
                {series.is_featured && (
                  <span className="px-4 py-1.5 bg-yellow-500/90 rounded-full text-xs font-semibold text-white flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    Featured
                  </span>
                )}
              </div>
              
              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                {series.title}
              </h1>
              
              {/* Alternative Titles */}
              {(series.title_vi || series.title_native) && (
                <div className="mb-4">
                  {series.title_vi && (
                    <p className="text-sm sm:text-base md:text-lg text-gray-300 mb-1">{series.title_vi}</p>
                  )}
                  {series.title_native && (
                    <p className="text-xs sm:text-sm text-gray-400">{series.title_native}</p>
                  )}
                </div>
              )}
              
              {/* Stats Row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 mb-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                  <span className="text-base sm:text-lg md:text-xl font-bold text-white">{series.score || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
                  <span className="text-sm sm:text-base md:text-lg text-white">{voteCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  <span className="text-sm sm:text-base md:text-lg text-white">--</span>
                </div>
              </div>
              
              {/* Author/Studio */}
              {(series.author || series.studio || series.publisher) && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4 text-xs sm:text-sm text-gray-300 mb-4">
                  {series.author && (
                    <span className="flex items-center">
                      <span className="text-gray-400 mr-1 sm:mr-2 hidden sm:inline">Author:</span>
                      {series.author}
                    </span>
                  )}
                  {series.studio && (
                    <span className="flex items-center">
                      <span className="text-gray-400 mr-1 sm:mr-2 hidden sm:inline">Studio:</span>
                      {series.studio}
                    </span>
                  )}
                  {series.publisher && (
                    <span className="flex items-center">
                      <span className="text-gray-400 mr-1 sm:mr-2 hidden sm:inline">Publisher:</span>
                      {series.publisher}
                    </span>
                  )}
                </div>
              )}
              
              {/* Action Buttons - Desktop Layout Preserved */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3">
                <button 
                  onClick={handleBookmark}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all text-sm sm:text-base ${
                    bookmarked 
                      ? 'bg-green-500 text-white' 
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">{bookmarked ? 'In Library' : 'Add to Library'}</span>
                  <span className="sm:hidden">Library</span>
                </button>
                
                <button className="px-4 sm:px-6 py-2 sm:py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all border border-dark-700 text-sm sm:text-base">
                  <Book className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Start Reading</span>
                  <span className="sm:hidden">Read</span>
                </button>
                
                <button 
                  onClick={handleVote}
                  disabled={voting}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all border border-dark-700 text-sm sm:text-base"
                >
                  {voting ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Heart className="w-4 h-4 sm:w-5 sm:h-5" />}
                  <span>{voting ? '...' : 'Vote'}</span>
                </button>
                
                <button onClick={handleShare} className="p-2 sm:p-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-all border border-dark-700">
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Desktop: 2/3 + 1/3 Grid, Mobile: Single Column */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Content - 2/3 on Desktop */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            
            {/* Synopsis - Desktop: Separate Card, Mobile: Collapsible */}
            <div className="glass rounded-2xl p-4 sm:p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-primary">Synopsis</h2>
              </div>
              <div className="relative">
                <div className={`text-secondary leading-relaxed text-sm sm:text-base md:text-lg ${
                  synopsisExpanded ? '' : 'line-clamp-4 sm:line-clamp-5'
                }`}>
                  {formatSynopsis(series.description || series.description_vi || '')}
                </div>
                {!synopsisExpanded && (series.description || series.description_vi) && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-dark-900 to-transparent pointer-events-none" />
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
            
            {/* Genres & Tags */}
            {(series.genres?.length > 0 || series.tags?.length > 0) && (
              <div className="glass rounded-2xl p-4 sm:p-6 md:p-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Tags className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-primary">Tags</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {series.genres?.map((genre: string, i: number) => (
                    <span 
                      key={`genre-${i}`}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary-500/20 text-primary-400 rounded-lg text-xs sm:text-sm font-medium hover:bg-primary-500/30 transition-colors cursor-pointer"
                    >
                      {genre}
                    </span>
                  ))}
                  {series.tags?.map((tag: string, i: number) => (
                    <span 
                      key={`tag-${i}`}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 bg-dark-800 text-secondary rounded-lg text-xs sm:text-sm hover:bg-dark-700 transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Information Grid */}
            <div className="glass rounded-2xl p-4 sm:p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-6">
                <Info className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-primary">Information</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <InfoItem icon={BookOpen} label="Type" value={typeText} />
                <InfoItem icon={Calendar} label="Status" value={series.status || '--'} />
                <InfoItem icon={Globe} label="Source" value={series.source || 'Manual'} />
                <InfoItem icon={Book} label="Author" value={series.author || '--'} />
                <InfoItem icon={Award} label="Publisher" value={series.publisher || '--'} />
                <InfoItem icon={TrendingUp} label="External ID" value={series.external_id || '--'} />
              </div>
            </div>
          </div>

          {/* Right Sidebar - 1/3 on Desktop, Full Width on Mobile */}
          <div className="space-y-4 sm:space-y-6">
            
            {/* Share */}
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-primary mb-4">Share</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleShare}
                  className="p-2 sm:p-3 bg-dark-800 hover:bg-dark-700 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                  <span className="text-xs sm:text-sm">Copy Link</span>
                </button>
                <button 
                  onClick={handleShareTwitter}
                  className="p-2 sm:p-3 bg-dark-800 hover:bg-dark-700 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Twitter className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                  <span className="text-xs sm:text-sm">Twitter</span>
                </button>
              </div>
            </div>
            
            {/* External Links */}
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-primary mb-4">External Links</h3>
              <div className="space-y-2 sm:space-y-3">
                <a 
                  href={`https://anilist.co/search/${series.item_type || 'anime'}?search=${encodeURIComponent(series.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 sm:p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors group"
                >
                  <span className="text-xs sm:text-sm text-secondary group-hover:text-primary transition-colors">AniList</span>
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-secondary group-hover:text-primary transition-colors" />
                </a>
                <a 
                  href={`https://myanimelist.net/search.php?q=${encodeURIComponent(series.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 sm:p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors group"
                >
                  <span className="text-xs sm:text-sm text-secondary group-hover:text-primary transition-colors">MyAnimeList</span>
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-secondary group-hover:text-primary transition-colors" />
                </a>
              </div>
            </div>
            
            {/* Last Updated */}
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-primary mb-4">Updated</h3>
              <div className="flex items-center space-x-3 text-secondary">
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
    <div className="p-3 bg-dark-800/50 rounded-lg">
      <div className="flex items-center space-x-2 text-secondary mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-primary">{value}</p>
    </div>
  )
}
