import { NextRequest, NextResponse } from 'next/server'
import { seriesService } from '../service'
import { supabase } from '@/lib/supabase'

interface RouteParams {
  params: { id: string }
}

// GET /api/series/:id
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid series ID' },
        { status: 400 }
      )
    }

    // Get series data
    const series = await seriesService.findOne(id)

    // Get anime metadata if applicable
    let anime_meta = null
    if (series.item_type === 'anime') {
      const { data, error } = await supabase
        .from('anime_meta')
        .select('*')
        .eq('series_id', id)
        .single()
      
      if (!error && data) {
        anime_meta = data
      }
    }

    // Get manga metadata if applicable
    let manga_meta = null
    if (series.item_type === 'manga') {
      const { data, error } = await supabase
        .from('manga_meta')
        .select('*')
        .eq('series_id', id)
        .single()
      
      if (!error && data) {
        manga_meta = data
      }
    }

    return NextResponse.json({
      ...series,
      anime_meta,
      manga_meta
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    )
  }
}

// ... PUT and DELETE methods remain the same
