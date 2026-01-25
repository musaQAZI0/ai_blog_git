import { NextRequest, NextResponse } from 'next/server'
import { generateMedicalImage } from '@/lib/images'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { title, context, style = 'illustration' } = await request.json()

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    const imageUrl = await generateMedicalImage(title, context, style)

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
      },
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate image',
      },
      { status: 500 }
    )
  }
}
