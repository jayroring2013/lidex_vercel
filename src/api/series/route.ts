import { NextRequest, NextResponse } from 'next/server'
import { seriesService } from './service'

// GET /api/series
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const filters = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const result = await seriesService.findAll(filters)

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/series
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.item_type) {
      return NextResponse.json(
        { error: 'Title and item_type are required' },
        { status: 400 }
      )
    }

    const result = await seriesService.create(body)

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
