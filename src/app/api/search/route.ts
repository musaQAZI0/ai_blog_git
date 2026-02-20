import { NextRequest, NextResponse } from 'next/server'
import { searchArticles, getSearchSuggestions } from '@/lib/search'
import { TargetAudience } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const targetAudience = searchParams.get('audience') as TargetAudience | null
    const tags = searchParams.get('tags')?.split(',')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const suggestions = searchParams.get('suggestions') === 'true'

    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Get suggestions for autocomplete
    if (suggestions) {
      const suggestionResults = await getSearchSuggestions(
        query,
        targetAudience || undefined,
        5
      )

      return NextResponse.json({
        success: true,
        data: {
          suggestions: suggestionResults,
        },
      })
    }

    // Perform full search
    const results = await searchArticles({
      query,
      targetAudience: targetAudience || undefined,
      tags,
      limit,
    })

    // Track search (would be better to do this client-side for analytics)
    // trackSearch(query, results.length)

    return NextResponse.json({
      success: true,
      data: {
        query,
        results,
        totalResults: results.length,
      },
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    )
  }
}
