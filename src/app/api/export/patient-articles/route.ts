import { NextRequest, NextResponse } from 'next/server'
import { getArticles } from '@/lib/firebase/articles'

export const dynamic = 'force-dynamic'

// This API endpoint exports patient articles for okulistykaakademicka.pl
export async function GET(request: NextRequest) {
  try {
    // Verify API secret
    const authHeader = request.headers.get('Authorization')
    const expectedSecret = `Bearer ${process.env.EXPORT_API_SECRET}`

    if (!authHeader || authHeader !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category') || undefined

    // Fetch patient articles
    const { articles } = await getArticles({
      targetAudience: 'patient',
      status: 'published',
      category,
      pageSize: Math.min(limit, 50), // Max 50 articles per request
    })

    // Format for export
    const exportedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt,
      coverImage: article.coverImage,
      category: article.category,
      tags: article.tags,
      author: article.authorName,
      publishedAt: article.publishedAt?.toISOString(),
      seo: article.seoMeta,
    }))

    return NextResponse.json({
      success: true,
      count: exportedArticles.length,
      articles: exportedArticles,
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    )
  }
}
