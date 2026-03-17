import { NextRequest, NextResponse } from 'next/server'
import { votesService } from './service'

// GET /api/votes/count/:seriesId
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const seriesId = searchParams.get('seriesId')

    if (!seriesId) {
      return NextResponse.json(
        { error: 'seriesId is required' },
        { status: 400 }
      )
    }

    const result = await votesService.getCount(parseInt(seriesId))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/votes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.novel_id) {
      return NextResponse.json(
        { error: 'novel_id is required' },
        { status: 400 }
      )
    }

    const result = await votesService.create(body.novel_id)

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
