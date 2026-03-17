'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Star, Heart, Calendar, BookOpen, Info, Tags, 
  ExternalLink, Share2, Copy, Twitter, Loader2,
  ArrowLeft, Bookmark, Award, TrendingUp, Globe, Tv
} from 'lucide-react'
import { fetchSeries, fetchVoteCount, submitVote } from '@/lib/api'
import RadarChart from '@/components/RadarChart'

export default function ContentDetail() {
  const params = useParams()
  const [series, setSeries] = useState<any>(null)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [imageError, setImageError] = useState(false)

  const seriesId = params.id ? parseInt(params.id as string) : undefined

  // ✅ Get cover and banner images from series table
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
      await submitVote(seriesId)
      setVoteCount(prev => prev + 1)
    } catch (err: any) {
      alert('Failed to vote: ' + err.message)
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

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    )
  }

  // Error State
  if (error || !series) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ArrowLeft className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Series Not Found</h1>
        <p className="text-secondary mb-8">{error || 'The series you\'re looking for doesn\'t exist.'}</p>
        <Link href="/dashboard" className="btn-primary inline-flex items-center space-x-2">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    )
  }

  const typeText = (series.item_type || 'Series').replace('_', ' ').toUpperCase()

  return (
    <div className="min-h-screen">
      {/* ✅ Hero Banner with Background Image */}
      <div className="relative h-[400px] sm:h-[500px] md:h-[600px] overflow-hidden">
        {/* Background Image with Blur */}
        <div className="absolute inset-0">
          {bannerImage ? (
            <>
              <img 
                src={bannerImage} 
                alt="" 
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              {/* Blur Overlay */}
              <div className="absolute inset-0 backdrop-blur-xl bg-dark-900/70" />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-dark-900/40" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-dark-900 to-dark-900" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent" />
            </>
          )}
        </div>
        
        {/* Content */}
        <div className="relative h-full max-w-7xl mx-auto px-4 flex items-end pb-8 sm:pb-12">
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 sm:gap-6 md:gap-8 w-full">
            {/* ✅ Cover Image - Mobile Responsive */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-32 sm:w-40 md:w-48 lg:w-64 rounded-lg sm:rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-dark-800">
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
                        parent.className = 'w-full h-48 sm:h-56 md:h-64 lg:h-72 bg-gradient-to-br from-primary-600 to-purple-700 flex items-center justify-center'
                        parent.innerHTML = '<svg class="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>'
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-48 sm:h-56 md:h-64 lg:h-72 bg-gradient-to-br from-primary-600 to-purple-700 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-white/50" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Info */}
            <div className="flex-1 text-center sm:text-left pb-2 sm:pb-4">
              {/* Type & Status Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3 sm:mb-4">
                <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-primary-500/90 rounded-full text-xs font-semibold text-white">
                  {typeText}
                </span>
                <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs font-semibold text-white ${
                  series.status === 'ongoing' || series.status === 'Ongoing' 
                    ? 'bg-green-500/90' 
                    : 'bg-blue-500/90'
                }`}>
                  {series.status || 'Unknown'}
                </span>
                {series.is_featured && (
                  <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-yellow-500/90 rounded-full text-xs font-semibold text-white flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    Featured
                  </span>
                )}
              </div>
              
              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 leading-tight">
                {series.title}
              </h1>
              
              {/* Alternative Titles */}
              {(series.title_vi || series.title_native) && (
                <div className="mb-3 sm:mb-4">
                  {series.title_vi && (
                    <p className="text-base sm:text-lg text-gray-300 mb-1">{series.title_vi}</p>
                  )}
                  {series.title_native && (
                    <p className="text-sm sm:text-base text-gray-400">{series.title_native}</p>
                  )}
                </div>
              )}
              
              {/* Stats Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                  <span className="text-lg sm:text-xl font-bold text-white">{series.score || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
                  <span className="text-base sm:text-lg text-white">{voteCount.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Author/Studio */}
              {(series.author || series.studio || series.publisher) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm text-gray-300 mb-4 sm:mb-6">
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
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                <button 
                  onClick={handleBookmark}
                  className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all text-sm sm:text-base ${
                    bookmarked 
                      ? 'bg-green-500 text-white' 
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">{bookmarked ? 'In Library' : 'Add to Library'}</span>
                  <span className="sm:hidden">Library</span>
                </button>
                
                <button 
                  onClick={handleVote}
                  disabled={voting}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all border border-dark-700 text-sm sm:text-base"
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            
            {/* Synopsis */}
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
                <h2 className="text-lg sm:text-xl font-bold text-primary">Synopsis</h2>
              </div>
              <p className="text-secondary leading-relaxed text-sm sm:text-base md:text-lg">
                {series.description || series.description_vi || 'No description available.'}
              </p>
            </div>

            {/* Radar Chart (Anime Only) */}
            {series.item_type === 'anime' && series.anime_meta && (
              <RadarChart series={series} />
            )}
            
            {/* Genres & Tags */}
            {(series.genres?.length > 0 || series.tags?.length > 0) && (
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Tags className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
                  <h2 className="text-lg sm:text-xl font-bold text-primary">Tags</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {series.genres?.map((genre: string, i: number) => (
                    <span 
                      key={`genre-${i}`}
                      className="px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-xs sm:text-sm font-medium hover:bg-primary-500/30 transition-colors cursor-pointer"
                    >
                      {genre}
                    </span>
                  ))}
                  {series.tags?.map((tag: string, i: number) => (
                    <span 
                      key={`tag-${i}`}
                      className="px-3 py-1.5 bg-dark-800 text-secondary rounded-lg text-xs sm:text-sm hover:bg-dark-700 transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Information Grid */}
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-6">
                <Info className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
                <h2 className="text-lg sm:text-xl font-bold text-primary">Information</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <InfoItem icon={BookOpen} label="Type" value={typeText} />
                <InfoItem icon={Calendar} label="Status" value={series.status || '--'} />
                <InfoItem icon={Globe} label="Source" value={series.source || 'Manual'} />
                <InfoItem icon={Tv} label="Author" value={series.author || '--'} />
                <InfoItem icon={Award} label="Publisher" value={series.publisher || '--'} />
                <InfoItem icon={TrendingUp} label="External ID" value={series.external_id || '--'} />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
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
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
                <span className="text-xs sm:text-sm">
                  {new Date(series.updated_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric'
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
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-secondary">
        <Icon className="w-4 h-4" />
        <span className="text-xs sm:text-sm">{label}</span>
      </div>
      <p className="text-primary font-semibold text-sm sm:text-base">{value}</p>
    </div>
  )
}
