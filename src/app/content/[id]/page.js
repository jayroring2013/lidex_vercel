'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Star, Heart, Calendar, BookOpen, Info, Tags, 
  ExternalLink, Share2, Copy, Twitter, Loader2,
  ArrowLeft, Bookmark, Book, MessageCircle, Eye,
  ChevronRight, Globe, Award, TrendingUp
} from 'lucide-react'
import { getSeriesById, getVoteCount, submitVote } from '../../../lib/supabase'

export default function ContentDetail() {
  const params = useParams()
  const [series, setSeries] = useState(null)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [voting, setVoting] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

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
      } catch (err) {
        console.error('Failed to load series:', err)
        setError(err.message)
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
    } catch (err) {
      alert('Failed to submit vote: ' + err.message)
    } finally {
      setVoting(false)
    }
  }

  const handleBookmark = () => {
    setBookmarked(!bookmarked)
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
      {/* Hero Banner */}
      <div className="relative h-[500px] md:h-[600px] overflow-hidden">
        {/* Background Image with Blur */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-xl opacity-50"
          style={{ 
            backgroundImage: series.cover_url ? `url(${series.cover_url})` : 'none',
            filter: 'blur(40px)'
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent" />
        
        {/* Content */}
        <div className="relative h-full max-w-7xl mx-auto px-4 flex items-end pb-12">
          <div className="flex flex-col md:flex-row items-end md:items-center gap-8 w-full">
            {/* Cover Image */}
            <div className="flex-shrink-0">
              <div className="w-48 md:w-64 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
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
              {/* Type & Status Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
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
                <div className="flex items-center space-x-2">
                  <Bookmark className="w-5 h-5 text-purple-400" />
                  <span className="text-lg text-white">--</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <span className="text-lg text-white">--</span>
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
              
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button 
                  onClick={handleBookmark}
                  className={`px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all ${
                    bookmarked 
                      ? 'bg-green-500 text-white' 
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  <Bookmark className="w-5 h-5" />
                  <span>{bookmarked ? 'In Library' : 'Add to Library'}</span>
                </button>
                
                <button className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all border border-dark-700">
                  <Book className="w-5 h-5" />
                  <span>Start Reading</span>
                </button>
                
                <button 
                  onClick={handleVote}
                  disabled={voting}
                  className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all border border-dark-700"
                >
                  {voting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
                  <span>{voting ? 'Voting...' : 'Vote'}</span>
                </button>
                
                <button className="p-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-all border border-dark-700">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Synopsis */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-primary">Synopsis</h2>
              </div>
              <p className="text-secondary leading-relaxed text-base md:text-lg">
                {series.description || series.description_vi || 'No description available.'}
              </p>
            </div>
            
            {/* Genres & Tags */}
            {(series.genres?.length > 0 || series.tags?.length > 0) && (
              <div className="glass rounded-2xl p-6 md:p-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Tags className="w-6 h-6 text-primary-500" />
                  <h2 className="text-xl font-bold text-primary">Tags</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {series.genres?.map((genre, i) => (
                    <span 
                      key={`genre-${i}`}
                      className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors cursor-pointer"
                    >
                      {genre}
                    </span>
                  ))}
                  {series.tags?.map((tag, i) => (
                    <span 
                      key={`tag-${i}`}
                      className="px-4 py-2 bg-dark-800 text-secondary rounded-lg text-sm hover:bg-dark-700 transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Information Grid */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-6">
                <Info className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-primary">Information</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <InfoItem icon={BookOpen} label="Type" value={typeText} />
                <InfoItem icon={Calendar} label="Status" value={series.status || '--'} />
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
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-primary mb-4">Share</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="p-3 bg-dark-800 hover:bg-dark-700 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Copy className="w-5 h-5 text-secondary" />
                  <span className="text-sm">Copy Link</span>
                </button>
                <button 
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(series.title)}`, '_blank')}
                  className="p-3 bg-dark-800 hover:bg-dark-700 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Twitter className="w-5 h-5 text-secondary" />
                  <span className="text-sm">Twitter</span>
                </button>
              </div>
            </div>
            
            {/* External Links */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-primary mb-4">External Links</h3>
              <div className="space-y-3">
                <a 
                  href={`https://anilist.co/search/${series.item_type || 'anime'}?search=${encodeURIComponent(series.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors group"
                >
                  <span className="text-sm text-secondary group-hover:text-primary transition-colors">AniList</span>
                  <ExternalLink className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                </a>
                <a 
                  href={`https://myanimelist.net/search.php?q=${encodeURIComponent(series.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors group"
                >
                  <span className="text-sm text-secondary group-hover:text-primary transition-colors">MyAnimeList</span>
                  <ExternalLink className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                </a>
              </div>
            </div>
            
            {/* Last Updated */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-primary mb-4">Updated</h3>
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
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-secondary">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-primary font-semibold">{value}</p>
    </div>
  )
}
