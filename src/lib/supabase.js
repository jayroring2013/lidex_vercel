import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getSeriesById(id) {
  console.log('🔍 Fetching series ID:', id)
  
  const { data, error } = await supabase
    .from('series')
    .select('*')
    .eq('id', id)
    .single()
  
  console.log('📊 Result:', data)
  console.log('📊 Error:', error)
  
  return { data, error }
}

export async function getVoteCount(seriesId) {
  const { count } = await supabase
    .from('novel_votes')
    .select('*', { count: 'exact', head: true })
    .eq('novel_id', seriesId)
  
  return count || 0
}

export async function submitVote(seriesId) {
  return await supabase
    .from('novel_votes')
    .insert([{ novel_id: seriesId, created_at: new Date().toISOString() }])
}

export async function getSiteStats() {
  const [seriesCount, animeCount, mangaCount, voteCount] = await Promise.all([
    supabase.from('series').select('*', { count: 'exact', head: true }),
    supabase.from('anime_meta').select('*', { count: 'exact', head: true }),
    supabase.from('manga_meta').select('*', { count: 'exact', head: true }),
    supabase.from('novel_votes').select('*', { count: 'exact', head: true })
  ])

  return {
    totalSeries: seriesCount.count || 0,
    totalAnime: animeCount.count || 0,
    totalManga: mangaCount.count || 0,
    totalVotes: voteCount.count || 0
  }
}

export async function getTrendingSeries({ limit = 10 } = {}) {
  return await supabase
    .from('series')
    .select('*')
    .order('is_featured', { ascending: false })
    .limit(limit)
}
