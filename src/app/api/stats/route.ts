import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/stats
export async function GET() {
  try {
    const [seriesCount, animeCount, mangaCount, voteCount] = await Promise.all([
      supabase.from('series').select('*', { count: 'exact', head: true }),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'anime'),
      supabase.from('series').select('*', { count: 'exact', head: true }).eq('item_type', 'manga'),
      supabase.from('novel_votes').select('*', { count: 'exact', head: true })
    ])

    // ✅ Get average popularity from anime_meta
    const { data: popularityData } = await supabase
      .from('anime_meta')
      .select('popularity')
      .not('popularity', 'is', null)

    const avgPopularity = popularityData 
      ? popularityData.reduce((sum, item) => sum + (item.popularity || 0), 0) / popularityData.length 
      : 600000

    const { min, max } = popularityData 
      ? {
          min: Math.min(...popularityData.map(p => p.popularity || 0)),
          max: Math.max(...popularityData.map(p => p.popularity || 0))
        }
      : { min: 500000, max: 1000000 }

    return NextResponse.json({
      totalSeries: seriesCount.count || 0,
      totalAnime: animeCount.count || 0,
      totalManga: mangaCount.count || 0,
      totalVotes: voteCount.count || 0,
      avgPopularity: Math.round(avgPopularity),
      minPopularity: min,
      maxPopularity: max
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
