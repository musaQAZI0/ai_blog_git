import { NextRequest, NextResponse } from 'next/server'
import { autoOptimizeSEO, generateSEOReport, generateMedicalArticleSchema } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { title, content, currentMeta, author, publishedDate, modifiedDate, imageUrl } =
      await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Auto-optimize SEO metadata
    const optimizedMeta = autoOptimizeSEO(title, content, currentMeta)

    // Generate SEO report
    const seoReport = generateSEOReport(title, content)

    // Generate schema markup
    const schemaMarkup = generateMedicalArticleSchema(
      title,
      optimizedMeta.description,
      author || 'Skrzypecki.pl',
      publishedDate ? new Date(publishedDate) : new Date(),
      modifiedDate ? new Date(modifiedDate) : new Date(),
      imageUrl
    )

    return NextResponse.json({
      success: true,
      data: {
        optimizedMeta,
        seoReport,
        schemaMarkup,
      },
    })
  } catch (error) {
    console.error('SEO optimization error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to optimize SEO',
      },
      { status: 500 }
    )
  }
}
