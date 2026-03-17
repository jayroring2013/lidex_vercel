import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/series/:id
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const seriesId = parseInt(id)
    
    if (isNaN(seriesId)) {
      return NextResponse.json(
        { error: 'Invalid series ID' },
        { status: 400 }
      )
    }

    // Get series data
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('*')
      .eq('id', seriesId)
      .single()

    if (seriesError || !series) {
      return NextResponse.json(
        { error: `Series with ID ${seriesId} not found` },
        { status: 404 }
      )
    }

    // Get anime metadata if applicable
    let anime_meta = null
    if (series.item_type === 'anime') {
      const { data, error } = await supabase
        .from('anime_meta')
        .select('*')
        .eq('series_id', seriesId)
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
        .eq('series_id', seriesId)
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
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/series/:id
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const seriesId = parseInt(id)
    const body = await request.json()

    if (isNaN(seriesId)) {
      return NextResponse.json(
        { error: 'Invalid series ID' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('series')
      .update(body)
      .eq('id', seriesId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: `Series with ID ${seriesId} not found` },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/series/:id
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const seriesId = parseInt(id)

    if (isNaN(seriesId)) {
      return NextResponse.json(
        { error: 'Invalid series ID' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('series')
      .delete()
      .eq('id', seriesId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
