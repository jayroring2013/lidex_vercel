import { NextRequest, NextResponse } from 'next/server'
import { seriesService } from '../service'

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

    const result = await seriesService.findOne(id)

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    )
  }
}

// PUT /api/series/:id
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid series ID' },
        { status: 400 }
      )
    }

    const result = await seriesService.update(id, body)

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    )
  }
}

// DELETE /api/series/:id
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid series ID' },
        { status: 400 }
      )
    }

    await seriesService.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
