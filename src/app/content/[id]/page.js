'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Star, Heart, Calendar, BookOpen, Info, Tags, 
  ExternalLink, Share2, Copy, Twitter, Loader2,
  ArrowLeft, AlertCircle
} from 'lucide-react'
import { getSeriesById, getVoteCount, submitVote } from '../../../lib/supabase'

export default function ContentDetail() {
  const params = useParams()
  const router = useRouter()
  const [series, setSeries] = useState(null)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!params.id) {
        setError('No series ID provided')
        setLoading(false)
        return
      }
      
      try {
        console.log('🔍 Loading series ID:', params.id)
        
        const { data, error } = await getSeriesById(params.id)
        
        console.log('📊 Series data:', data)
        console.log('📊 Error:', error)
        
        if (error || !data) {
          throw new Error(`Series with ID "${params.id}" not found in database`)
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
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-primary mb-4">Series Not Found</h1>
        <p className="text-secondary mb-8">{error || 'The series you\'re looking for doesn\'t exist.'}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard" className="btn-primary inline-flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
          <Link href="/" className="btn-secondary inline-flex items-center space-x-2">
            <span>Go to Home</span>
          </Link>
        </div>
        
        {/* Debug Info */}
        <div className="mt-8 p-4 glass rounded-lg text-left">
          <p className="text-sm text-secondary mb-2">Debug Info:</p>
          <p className="text-xs font-mono text-muted">ID: {params.id}</p>
          <p className="text-xs font-mono text-muted">
            URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}
          </p>
        </div>
      </div>
    )
  }

  const typeText = (series.item_type || 'Series').charAt(0).toUpperCase() + (series.item_type || 'series').slice(1)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-secondary mb-6">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span>›</span>
        <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
        <span>›</span>
        <span className="text-primary">{series.title}</span>
      </div>

      {/* Hero Header */}
      <div className="glass rounded-xl overflow-hidden mb-8">
        <div className="relative h-64 md:h-80 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative h-full flex items-end p-6 md:p-8">
            <div className="flex items-end space-x-6">
              {series.cover_url && (
                <div className="w-40 h-56 md:w-48 md:h-64 bg-secondary rounded-lg shadow-2xl overflow-hidden border-2 border-white/20">
                  <img src={series.cover_url} alt={series.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="px-3 py-1 bg-purple-500/80 rounded-full text-xs font-medium text-white">
                    {typeText}
                  </span>
                  <span className="px-3 py-1 bg-green-500/80 rounded-full text-xs font-medium text-white">
                    {series.status || 'Unknown'}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{series.title}</h1>
                <div className="flex items-center gap-6 text-sm">
                  <span className="flex items-center text-gray-200">
                    <Star className="w-4 h-4 mr-1 text-yellow-400" />
                    <span className="font-mono">{series.score || 'N/A'}</span>
                  </span>
                  <span className="flex items-center text-gray-200">
                    <Heart className="w-4 h-4 mr-1 text-green-400" />
                    <span className="font-mono">{voteCount.toLocaleString()}</span> votes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-primary">Synopsis</h3>
            </div>
            <p className="text-secondary leading-relaxed">
              {series.description || series.description_vi || 'No description available.'}
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Info className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-primary">Information</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem label="Type" value={typeText} />
              <InfoItem label="Status" value={series.status || '--'} />
              <InfoItem label="Author" value={series.author || '--'} />
              <InfoItem label="Publisher" value={series.publisher || series.studio || '--'} />
              <InfoItem label="Source" value={series.source || 'Manual'} />
              <InfoItem label="External ID" value={series.external_id || '--'} />
            </div>
          </div>

          {series.genres && series.genres.length > 0 && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Tags className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-primary">Genres</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {series.genres.map((genre, i) => (
                  <span key={i} className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {series.tags && series.tags.length > 0 && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Tags className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-primary">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {series.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 glass rounded-full text-xs text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-primary">Support</h3>
            </div>
            <button
              onClick={handleVote}
              disabled={voting}
              className="w-full btn-primary flex items-center justify-center space-x-2 mb-3 py-3"
            >
              {voting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
              <span>{voting ? 'Submitting...' : 'Vote for this series'}</span>
            </button>
            <p className="text-xs text-secondary text-center">You can vote once per week</p>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <ExternalLink className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-primary">External Links</h3>
            </div>
            <div className="space-y-2">
              <a 
                href={`https://anilist.co/search/${series.item_type || 'anime'}?search=${encodeURIComponent(series.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm text-primary-500 hover:text-primary-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Search on AniList</span>
              </a>
              <a 
                href={`https://myanimelist.net/search.php?q=${encodeURIComponent(series.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm text-primary-500 hover:text-primary-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Search on MyAnimeList</span>
              </a>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Share2 className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-primary">Share</h3>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Link copied to clipboard!')
                }} 
                className="flex-1 p-3 glass rounded-lg hover:bg-hover-bg transition-colors"
              >
                <Copy className="w-5 h-5 text-secondary" />
              </button>
              <button 
                onClick={() => {
                  const text = encodeURIComponent(`Check out "${series.title}" on LiDex Analytics!`)
                  const url = encodeURIComponent(window.location.href)
                  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
                }} 
                className="flex-1 p-3 glass rounded-lg hover:bg-hover-bg transition-colors"
              >
                <Twitter className="w-5 h-5 text-secondary" />
              </button>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-primary">Last Updated</h3>
            </div>
            <p className="text-sm text-secondary">
              {new Date(series.updated_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Component
function InfoItem({ label, value }) {
  return (
    <div className="p-3 glass rounded-lg">
      <p className="text-xs text-secondary mb-1">{label}</p>
      <p className="text-primary font-medium">{value}</p>
    </div>
  )
}
