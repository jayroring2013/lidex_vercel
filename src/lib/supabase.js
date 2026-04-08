import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// SITE STATS
// Uses: series (by item_type)
// Skipped: voting_results (no data yet)
// ============================================
export async function getSiteStats() {
  try {
    const [animeRes, mangaRes, novelRes] = await Promise.all([
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'anime').eq('anime_meta.season_year', 2026),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'manga'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'novel'),
    ])

    const totalAnime  = animeRes.count  ?? 0
    const totalManga  = mangaRes.count  ?? 0
    const totalNovels = novelRes.count  ?? 0

    return {
      totalSeries: totalAnime + totalManga + totalNovels,
      totalAnime,
      totalManga,
      totalNovels,
      // voting_results has no data yet — reserved for future community voting feature
      totalVotes: 0,
    }
  } catch (error) {
    console.error('Failed to get stats:', error)
    return { totalSeries: 0, totalAnime: 0, totalManga: 0, totalNovels: 0, totalVotes: 0 }
  }
}

// ============================================
// TRENDING SERIES
// Uses: anime_meta (trending ASC) → series
// Old: series.is_featured (column does not exist)
// ============================================
export async function getTrendingSeries({ limit = 10 } = {}) {
  try {
    const { data, error } = await supabase
      .from('anime_meta')
      .select(`
        series_id,
        trending,
        mean_score,
        popularity,
        format,
        episodes,
        season,
        season_year,
        series!inner (
          id, title, title_vi, title_native, slug, cover_url,
          banner_url, status, genres, item_type
        )
      `)
      .not('trending', 'is', null)
      .order('trending', { ascending: true })
      .limit(limit)

    if (error) throw error

    // Flatten for easy consumption
    const flat = (data || []).map(r => ({
      ...r.series,
      anime_trending:   r.trending,
      anime_mean_score: r.mean_score,
      anime_popularity: r.popularity,
      anime_format:     r.format,
      anime_episodes:   r.episodes,
      anime_season:     r.season,
      anime_season_year: r.season_year,
    }))

    return { data: flat, error: null }
  } catch (error) {
    console.error('Failed to get trending:', error)
    return { data: [], error }
  }
}

// ============================================
// TOP RATED SERIES
// Uses: anime_meta (mean_score DESC) → series
// Old: series.score (column does not exist)
// ============================================
export async function getTopRatedSeries({ limit = 10 } = {}) {
  try {
    const { data, error } = await supabase
      .from('anime_meta')
      .select(`
        series_id,
        mean_score,
        average_score,
        popularity,
        favourites,
        format,
        episodes,
        series!inner (
          id, title, title_vi, title_native, slug, cover_url,
          banner_url, status, genres, item_type
        )
      `)
      .eq('season_year', 2026)
      .not('mean_score', 'is', null)
      .order('mean_score', { ascending: false })
      .limit(limit)

    if (error) throw error

    const flat = (data || []).map(r => ({
      ...r.series,
      anime_mean_score:    r.mean_score,
      anime_average_score: r.average_score,
      anime_popularity:    r.popularity,
      anime_favourites:    r.favourites,
      anime_format:        r.format,
      anime_episodes:      r.episodes,
    }))

    return { data: flat, error: null }
  } catch (error) {
    console.error('Failed to get top rated:', error)
    return { data: [], error }
  }
}

// ============================================
// SERIES COUNT BY TYPE
// Uses: series (item_type filter)
// ============================================
export async function getSeriesCountByType() {
  try {
    const [anime, manga, novel] = await Promise.all([
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'anime').eq('anime_meta.season_year', 2026),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'manga'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'novel'),
    ])
    return {
      data: [anime.count ?? 0, manga.count ?? 0, novel.count ?? 0],
      error: null,
    }
  } catch (error) {
    console.error('Failed to get type distribution:', error)
    return { data: [0, 0, 0], error }
  }
}

// ============================================
// VOTE STATS — STUB (no data yet)
// voting_periods and voting_results exist in schema
// but have not been populated yet.
// TODO: implement when community voting feature is live.
// ============================================
export async function getVoteStats({ days = 30 } = {}) {
  // voting_results has no data — return empty shape
  return { data: { labels: [], values: [] }, error: null }
}

// ============================================
// RECENT ACTIVITY
// Uses: stat_snapshots (most recently snapshotted anime)
// Old: novel_votes (table does not exist)
// ============================================
export async function getRecentActivity({ limit = 10 } = {}) {
  try {
    const { data, error } = await supabase
      .from('stat_snapshots')
      .select(`
        id, week_start, aired_episode,
        series!inner (
          id, title, item_type, cover_url, slug
        )
      `)
      .order('week_start', { ascending: false })
      .limit(limit)

    if (error) throw error

    const activities = (data || []).map(snap => ({
      type:       'snapshot',
      series:     snap.series,
      week_start: snap.week_start,
      episode:    snap.aired_episode,
    }))

    return { data: activities, error: null }
  } catch (error) {
    console.error('Failed to get activity:', error)
    return { data: [], error }
  }
}

// ============================================
// RELEASE SCHEDULE
// Uses: volumes (release_date >= today) → series
// Old: release_schedule (table does not exist)
// ============================================
export async function getReleaseSchedule({ limit = 10 } = {}) {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    const { data, error } = await supabase
      .from('volumes')
      .select(`
        id, volume_number, title, release_date, price, currency,
        cover_url, is_special, is_digital, translator,
        series!inner (
          id, title, title_vi, item_type, cover_url, slug
        ),
        publishers (
          id, name
        )
      `)
      .gte('release_date', today)
      .eq('is_special', false)
      .order('release_date', { ascending: true })
      .limit(limit)

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Failed to get releases:', error)
    return { data: [], error }
  }
}

// ============================================
// SERIES BY ID
// Uses: series
// ============================================
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

// ============================================
// VOTE COUNT — STUB (no data yet)
// voting_results exists in schema but is empty.
// TODO: implement when community voting feature is live.
// ============================================
export async function getVoteCount(seriesId) {
  // voting_results has no data — return 0
  return 0
}

// ============================================
// SUBMIT VOTE — STUB (not implemented yet)
// voting_periods must exist before votes can be recorded.
// TODO: implement when community voting feature is live.
// ============================================
export async function submitVote(seriesId) {
  console.warn('submitVote: community voting feature is not yet implemented.')
  return { data: null, error: new Error('Voting feature not yet available') }
}
