// ... existing code ...

// Get series count by type (for distribution chart)
export async function getSeriesCountByType() {
  const { data, error } = await supabase.rpc('get_series_count_by_type')
  
  if (error) {
    // Fallback: manual count
    const [anime, manga, ln] = await Promise.all([
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'anime'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'manga'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'light_novel')
    ])
    
    return {
      data: [anime.count || 0, manga.count || 0, ln.count || 0],
      error: null
    }
  }
  
  return { data, error }
}

// Get vote statistics for chart (last N days)
export async function getVoteStats({ days = 30 } = {}) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data, error } = await supabase
    .from('novel_votes')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })
  
  if (error) return { data: [], error }
  
  // Group by day
  const votesByDay = {}
  data.forEach(vote => {
    const date = new Date(vote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    votesByDay[date] = (votesByDay[date] || 0) + 1
  })
  
  const labels = Object.keys(votesByDay)
  const values = Object.values(votesByDay)
  
  return { data: { labels, values }, error: null }
}

// Get top rated series
export async function getTopRatedSeries({ limit = 10 } = {}) {
  return await supabase
    .from('series')
    .select('*')
    .not('score', 'is', null)
    .order('score', { ascending: false })
    .limit(limit)
}

// Get series by type
export async function getSeriesByType(type, { limit = 20 } = {}) {
  return await supabase
    .from('series')
    .select('*')
    .eq('item_type', type)
    .order('created_at', { ascending: false })
    .limit(limit)
}

// Get recent activity (votes, new series, etc.)
export async function getRecentActivity({ limit = 20 } = {}) {
  const { data: votes, error: votesError } = await supabase
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
  
  if (votesError) return { data: [], error: votesError }
  
  return { 
    data: votes.map(v => ({
      type: 'vote',
      series: v.series,
      created_at: v.created_at
    })), 
    error: null 
  }
}

// Get upcoming release schedule
export async function getReleaseSchedule({ limit = 10 } = {}) {
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
  
  return { data: data || [], error }
}

// Get featured items
export async function getFeaturedItems({ limit = 6 } = {}) {
  return await supabase
    .from('featured_items')
    .select(`
      *,
      series (
        id,
        title,
        item_type,
        cover_url,
        score
      )
    `)
    .order('sort_order', { ascending: true })
    .limit(limit)
}

// Get monthly stats comparison
export async function getMonthlyStats() {
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  
  const [currentVotes, seriesAdded] = await Promise.all([
    supabase.from('novel_votes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`),
    supabase.from('series')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
  ])
  
  return {
    votes: currentVotes.count || 0,
    newSeries: seriesAdded.count || 0
  }
}

// Get genre distribution
export async function getGenreDistribution() {
  const { data, error } = await supabase
    .from('series')
    .select('genres')
    .not('genres', 'is', null)
  
  if (error) return { data: [], error }
  
  // Count genres
  const genreCount = {}
  data.forEach(series => {
    if (series.genres) {
      series.genres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1
      })
    }
  })
  
  // Sort and return top 10
  const sorted = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  
  return { 
    data: {
      labels: sorted.map(([genre]) => genre),
      values: sorted.map(([, count]) => count)
    }, 
    error: null 
  }
}

// Get status distribution
export async function getStatusDistribution() {
  const { data, error } = await supabase
    .from('series')
    .select('status')
  
  if (error) return { data: [], error }
  
  const statusCount = {}
  data.forEach(series => {
    const status = series.status || 'Unknown'
    statusCount[status] = (statusCount[status] || 0) + 1
  })
  
  return { 
    data: {
      labels: Object.keys(statusCount),
      values: Object.values(statusCount)
    }, 
    error: null 
  }
}

// Get score distribution
export async function getScoreDistribution() {
  const { data, error } = await supabase
    .from('series')
    .select('score')
    .not('score', 'is', null)
  
  if (error) return { data: [], error }
  
  // Group by score ranges
  const ranges = {
    '9-10': 0,
    '8-9': 0,
    '7-8': 0,
    '6-7': 0,
    '0-6': 0
  }
  
  data.forEach(series => {
    const score = parseFloat(series.score)
    if (score >= 9) ranges['9-10']++
    else if (score >= 8) ranges['8-9']++
    else if (score >= 7) ranges['7-8']++
    else if (score >= 6) ranges['6-7']++
    else ranges['0-6']++
  })
  
  return { 
    data: {
      labels: Object.keys(ranges),
      values: Object.values(ranges)
    }, 
    error: null 
  }
}
