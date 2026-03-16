import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Debug logging
console.log('🔍 Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('🔍 Supabase Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel')
  throw new Error('Missing Supabase environment variables')
}

// Create and export supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// EXPORTED FUNCTIONS
// ============================================

// Get site statistics
export async function getSiteStats() {
  try {
    const [seriesCount, animeCount, mangaCount, voteCount] = await Promise.all([
      supabase.from('series').select('*', { count: 'exact', head: true }),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'anime'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'manga'),
      supabase.from('novel_votes').select('*', { count: 'exact', head: true })
    ])

    return {
      totalSeries: seriesCount.count || 0,
      totalAnime: animeCount.count || 0,
      totalManga: mangaCount.count || 0,
      totalVotes: voteCount.count || 0
    }
  } catch (error) {
    console.error('Failed to get stats:', error)
    return { totalSeries: 0, totalAnime: 0, totalManga: 0, totalVotes: 0 }
  }
}

// Get trending series
export async function getTrendingSeries({ limit = 10 } = {}) {
  try {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .order('is_featured', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Failed to get trending:', error)
    return { data: [], error }
  }
}

// Get top rated series
export async function getTopRatedSeries({ limit = 10 } = {}) {
  try {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .not('score', 'is', null)
      .order('score', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Failed to get top rated:', error)
    return { data: [], error }
  }
}

// Get series count by type
export async function getSeriesCountByType() {
  try {
    const [anime, manga, ln] = await Promise.all([
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'anime'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'manga'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'light_novel')
    ])
    
    return { data: [anime.count || 0, manga.count || 0, ln.count || 0], error: null }
  } catch (error) {
    console.error('Failed to get type distribution:', error)
    return { data: [0, 0, 0], error }
  }
}

// Get vote stats (last N days)
export async function getVoteStats({ days = 30 } = {}) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('novel_votes')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    // Group by day
    const votesByDay = {}
    data?.forEach(vote => {
      const date = new Date(vote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      votesByDay[date] = (votesByDay[date] || 0) + 1
    })
    
    const labels = Object.keys(votesByDay)
    const values = Object.values(votesByDay)
    
    return { data: { labels, values }, error: null }
  } catch (error) {
    console.error('Failed to get vote stats:', error)
    return { data: { labels: [], values: [] }, error }
  }
}

// Get recent activity
export async function getRecentActivity({ limit = 10 } = {}) {
  try {
    const { data, error } = await supabase
      .from('novel_votes')
      .select(`
        *,
        series (
          id,
          title,
          item_type,
          cover_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    const activities = data?.map(v => ({
      type: 'vote',
      series: v.series,
      created_at: v.created_at
    })) || []
    
    return { data: activities, error: null }
  } catch (error) {
    console.error('Failed to get activity:', error)
    return { data: [], error }
  }
}

// Get release schedule
export async function getReleaseSchedule({ limit = 10 } = {}) {
  try {
    const { data, error } = await supabase
      .from('release_schedule')
      .select(`
        *,
        series (
          id,
          title,
          item_type,
          cover_url
        )
      `)
      .gte('release_date', new Date().toISOString())
      .order('release_date', { ascending: true })
      .limit(limit)
    
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Failed to get releases:', error)
    return { data: [], error }
  }
}

// Get series by ID
export async function getSeriesById(id) {
  try {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to get series:', error)
    return { data: null, error }
  }
}

// Get vote count for series
export async function getVoteCount(seriesId) {
  try {
    const { count } = await supabase
      .from('novel_votes')
      .select('*', { count: 'exact', head: true })
      .eq('novel_id', seriesId)
    
    return count || 0
  } catch (error) {
    console.error('Failed to get vote count:', error)
    return 0
  }
}

// Submit vote
export async function submitVote(seriesId) {
  try {
    const { data, error } = await supabase
      .from('novel_votes')
      .insert([{ novel_id: seriesId, created_at: new Date().toISOString() }])
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to submit vote:', error)
    return { data: null, error }
  }
}
