'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Star, Heart, Calendar, BookOpen, Info, Tags, 
  ExternalLink, Share2, Copy, Twitter, Loader2 
} from 'lucide-react'
import { getSeriesById, getVoteCount, submitVote } from '@/lib/supabase'

export default function ContentDetail() {
  const params = useParams()
  const [series, setSeries] = useState(null)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!params.id) return
      
      try {
        const { data, error } = await getSeriesById(params.id)
        if (error || !data) throw new Error('Series not found')
        
        setSeries(data)
        const votes = await getVoteCount(params.id)
        setVoteCount(votes)
      } catch (error) {
        console.error('Failed to load series:', error)
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
    } catch (error) {
      alert('Failed to submit vote: ' + error.message)
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (!series) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-primary mb-4">Series Not Found</h2>
        <Link href="/dashboard" className="btn-primary">Back to Dashboard</Link>
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
                  <span className="px-3 py-1 bg-purple-500/80 rounded-full text-xs font-medium text-white">{typeText}</span>
                  <span className="px-3 py-1 bg-green-500/80 rounded-full text-xs font-medium text-white">{series.status || 'Unknown'}</span>
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
            <h3 className="text-lg font-semibold text-primary mb-4">Synopsis</h3>
            <p className="text-secondary leading-relaxed">{series.description || 'No description available.'}</p>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Type" value={typeText} />
              <InfoItem label="Status" value={series.status || '--'} />
              <InfoItem label="Author" value={series.author || '--'} />
              <InfoItem label="Publisher" value={series.publisher || series.studio || '--'} />
            </div>
          </div>

          {series.genres && series.genres.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {series.genres.map((genre, i) => (
                  <span key={i} className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Support</h3>
            <button
              onClick={handleVote}
              disabled={voting}
              className="w-full btn-primary flex items-center justify-center space-x-2 mb-3 py-3"
            >
              {voting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
              <span>{voting ? 'Submitting...' : 'Vote for this series'}</span>
            </button>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Share</h3>
            <div className="flex gap-3">
              <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex-1 p-3 glass rounded-lg hover:bg-hover-bg">
                <Copy className="w-5 h-5 text-secondary" />
              </button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(series.title)}`, '_blank')} className="flex-1 p-3 glass rounded-lg hover:bg-hover-bg">
                <Twitter className="w-5 h-5 text-secondary" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="p-3 glass rounded-lg">
      <p className="text-xs text-secondary mb-1">{label}</p>
      <p className="text-primary font-medium">{value}</p>
    </div>
  )
}
