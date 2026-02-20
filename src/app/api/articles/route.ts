import { NextRequest, NextResponse } from 'next/server'
import { getArticles } from '@/lib/firebase/articles'
import { TargetAudience, ArticleStatus } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetAudience = searchParams.get('targetAudience') as TargetAudience | null
    const status = searchParams.get('status') as ArticleStatus | null
    const pageSize = parseInt(searchParams.get('pageSize') || '12')

    const { articles } = await getArticles({
      targetAudience: targetAudience || undefined,
      status: status || 'published',
      pageSize: Math.min(pageSize, 50),
    })

    return NextResponse.json({
      success: true,
      articles,
    })
  } catch (error) {
    console.error('Articles fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
