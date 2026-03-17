import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/series
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    const type = searchParams.get('type') || undefined
    const search = searchParams.get('search') || undefined

    let query = supabase.from('series').select('*', { count: 'exact' })

    if (type) query = query.eq('item_type', type)
    if (search) query = query.ilike('title', `%${search}%`)

    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json({ data, count: count || 0 })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
