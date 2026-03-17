'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Star, Heart, Calendar, BookOpen, Info,
  ExternalLink, Copy, Twitter, Loader2,
  ArrowLeft, Book, Award, TrendingUp, Globe, ChevronDown, ChevronUp,
  Share2, Zap
} from 'lucide-react'
import { getSeriesById, getVoteCount, submitVote } from '../../../lib/supabase'

export default function ContentDetail() {
  const params = useParams()
  const [series, setSeries] = useState<any>(null)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!params.id) {
        setError('No series ID provided')
        setLoading(false)
        return
      }
      try {
        const { data, error } = await getSeriesById(params.id)
        if (error || !data) throw new Error(`Series with ID "${params.id}" not found`)
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
    if (!text) return <p className="text-gray-400 italic">No description available.</p>
    const cleanText = text.replace(/<br\s*\/?>/gi, '\n\n')
    return cleanText.split(/\n\n+/).map((paragraph, i) => (
      <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-400 animate-pulse">Loading series…</p>
        </div>
      </div>
    )
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <ArrowLeft className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Series Not Found</h1>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">{error || "The series you're looking for doesn't exist."}</p>
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const typeText = (series.item_type || 'Series').replace('_', ' ').toUpperCase()
  const isOngoing = series.status === 'ongoing' || series.status === 'Ongoing'

  return (
    <div className="min-h-screen bg-dark-900">

      {/* ── Hero ── */}
      <div className="relative">
        {/* Blurred backdrop */}
        <div className="absolute inset-0 h-[420px] overflow-hidden">
          {series.cover_url ? (
            <>
              <img src={series.cover_url} alt="" className="w-full h-full object-cover scale-105" />
              <div className="absolute inset-0 backdrop-blur-2xl bg-dark-900/75" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-purple-900 to-dark-900" />
          )}
          {/* Bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent" />
          {/* Side vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-dark-900/40 via-transparent to-dark-900/40" />
        </div>

        {/* Hero content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 pt-28 pb-10">

            {/* Cover */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary-500/40 to-purple-600/40 blur-sm opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-44 md:w-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-dark-800">
                  {series.cover_url ? (
                    <img
                      src={series.cover_url}
                      alt={series.title}
                      className="w-full h-auto block"
                    />
                  ) : (
                    <div className="w-full h-72 bg-gradient-to-br from-primary-700 to-purple-800 flex items-center justify-center">
                      <BookOpen className="w-20 h-20 text-white/30" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="flex-1 text-center md:text-left min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                <span className="px-3 py-1 bg-primary-500/80 backdrop-blur-sm rounded-full text-xs font-bold text-white tracking-wide">
                  {typeText}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white tracking-wide backdrop-blur-sm ${
                  isOngoing ? 'bg-emerald-500/80' : 'bg-sky-500/80'
                }`}>
                  {(series.status || 'Unknown').toUpperCase()}
                </span>
                {series.is_featured && (
                  <span className="px-3 py-1 bg-amber-500/80 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                    <Award className="w-3 h-3" /> Featured
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2 leading-tight tracking-tight">
                {series.title}
              </h1>

              {/* Alt titles */}
              {(series.title_vi || series.title_native) && (
                <div className="mb-4 space-y-0.5">
                  {series.title_vi && <p className="text-base text-gray-300">{series.title_vi}</p>}
                  {series.title_native && <p className="text-sm text-gray-500">{series.title_native}</p>}
                </div>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 mb-5">
                {series.score && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="text-xl font-bold text-white">{series.score}</span>
                    <span className="text-xs text-gray-400 mt-0.5">/100</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="text-base font-semibold text-white">{voteCount.toLocaleString()}</span>
                  <span className="text-xs text-gray-400">votes</span>
                </div>
              </div>

              {/* Studio / Publisher */}
              {(series.author || series.studio || series.publisher) && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-1 text-sm text-gray-300 mb-5">
                  {series.author && (
                    <span><span className="text-gray-500 mr-1.5">Author</span>{series.author}</span>
                  )}
                  {series.studio && (
                    <span><span className="text-gray-500 mr-1.5">Studio</span>{series.studio}</span>
                  )}
                  {series.publisher && (
                    <span><span className="text-gray-500 mr-1.5">Publisher</span>{series.publisher}</span>
                  )}
                </div>
              )}

              {/* Genres */}
              {series.genres && series.genres.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  {series.genres.slice(0, 7).map((genre: string, i: number) => (
                    <span
                      key={`genre-${i}`}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-gray-200 transition-colors cursor-default"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Vote button (desktop — hero right) */}
            <div className="hidden md:flex flex-shrink-0 flex-col items-center gap-2 pb-1">
              <button
                onClick={handleVote}
                disabled={voting}
                className="group flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-primary-600/90 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 border border-primary-400/30 shadow-lg shadow-primary-900/30 hover:shadow-primary-700/40"
              >
                {voting ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Zap className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                )}
                <span className="text-xs font-bold text-white tracking-wide">VOTE</span>
              </button>
              <span className="text-xs text-gray-400">{voteCount.toLocaleString()} votes</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Mobile vote */}
            <button
              onClick={handleVote}
              disabled={voting}
              className="lg:hidden w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-semibold text-white text-sm"
            >
              {voting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Vote for this Series
            </button>

            {/* Synopsis */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-700 flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-primary-400" />
                <h2 className="text-base font-bold text-white">Synopsis</h2>
              </div>
              <div className="px-6 py-5">
                <div className={`relative text-gray-300 leading-relaxed text-sm md:text-[0.9375rem] ${
                  synopsisExpanded ? '' : 'line-clamp-5'
                }`}>
                  {formatSynopsis(series.description || series.description_vi || '')}
                  {!synopsisExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-dark-800 to-transparent pointer-events-none" />
                  )}
                </div>
                {(series.description || series.description_vi) && (
                  <button
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    className="mt-4 inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
                  >
                    {synopsisExpanded ? (
                      <><ChevronUp className="w-4 h-4" /> Show less</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" /> Read more</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Information Grid */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-700 flex items-center gap-2.5">
                <Info className="w-5 h-5 text-primary-400" />
                <h2 className="text-base font-bold text-white">Information</h2>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoItem icon={BookOpen} label="Type" value={typeText} />
                <InfoItem icon={Calendar} label="Status" value={(series.status || '--').toUpperCase()} accent={isOngoing ? 'green' : 'blue'} />
                <InfoItem icon={Globe} label="Source" value={series.source || 'Manual'} />
                <InfoItem icon={Book} label="Author" value={series.author || '--'} />
                <InfoItem icon={Award} label="Publisher" value={series.publisher || '--'} />
                <InfoItem icon={TrendingUp} label="External ID" value={series.external_id || '--'} />
              </div>
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-4">

            {/* Share */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-700 flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-bold text-white">Share</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-dark-700 hover:bg-dark-600 rounded-xl text-xs font-medium text-gray-300 hover:text-white transition-all border border-dark-600 hover:border-dark-500"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={handleShareTwitter}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-dark-700 hover:bg-[#1d9bf020] rounded-xl text-xs font-medium text-gray-300 hover:text-[#1d9bf0] transition-all border border-dark-600 hover:border-[#1d9bf040]"
                >
                  <Twitter className="w-3.5 h-3.5" />
                  Twitter
                </button>
              </div>
            </div>

            {/* External Links */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-700 flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-bold text-white">External Links</h3>
              </div>
              <div className="p-3 space-y-2">
                <ExternalLinkItem
                  href={`https://anilist.co/search/${series.item_type || 'anime'}?search=${encodeURIComponent(series.title)}`}
                  label="AniList"
                  color="#02a9ff"
                />
                <ExternalLinkItem
                  href={`https://myanimelist.net/search.php?q=${encodeURIComponent(series.title)}`}
                  label="MyAnimeList"
                  color="#2e51a2"
                />
              </div>
            </div>

            {/* Updated */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Last Updated</p>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span className="text-sm text-gray-300">
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

// ── Sub-components ──

function InfoItem({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: any
  label: string
  value: string
  accent?: 'green' | 'blue'
}) {
  const accentColor = accent === 'green'
    ? 'text-emerald-400'
    : accent === 'blue'
    ? 'text-sky-400'
    : 'text-white'

  return (
    <div className="p-3 bg-dark-700/60 hover:bg-dark-700 rounded-xl transition-colors group">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-primary-400 transition-colors" />
        <span className="text-[0.7rem] text-gray-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className={`text-sm font-bold ${accentColor} truncate`}>{value}</p>
    </div>
  )
}

function ExternalLinkItem({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between px-4 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors group border border-dark-600 hover:border-dark-500"
    >
      <div className="flex items-center gap-2.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">{label}</span>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
    </a>
  )
}
