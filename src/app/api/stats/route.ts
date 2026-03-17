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

    return NextResponse.json({
      totalSeries: seriesCount.count || 0,
      totalAnime: animeCount.count || 0,
      totalManga: mangaCount.count || 0,
      totalVotes: voteCount.count || 0
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
