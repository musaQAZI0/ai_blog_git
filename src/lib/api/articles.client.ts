import { Article, TargetAudience } from '@/types'

interface ArticlesApiResponse {
  success: boolean
  articles?: Article[]
  error?: string
}

interface ArticleBySlugApiResponse {
  success: boolean
  article?: Article
  error?: string
}

interface SearchApiResponse {
  success: boolean
  data?: {
    results: Array<{
      article: Article
    }>
  }
  error?: string
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T
  return payload
}

export async function fetchPublishedArticles(
  targetAudience: TargetAudience,
  pageSize = 50
): Promise<Article[]> {
  const params = new URLSearchParams({
    targetAudience,
    status: 'published',
    pageSize: String(pageSize),
  })

  const response = await fetch(`/api/articles?${params.toString()}`, {
    cache: 'no-store',
  })
  const payload = await parseResponse<ArticlesApiResponse>(response)

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Failed to fetch articles')
  }

  return payload.articles || []
}

export async function searchPublishedArticles(
  query: string,
  targetAudience: TargetAudience,
  limit = 20
): Promise<Article[]> {
  const params = new URLSearchParams({
    q: query,
    audience: targetAudience,
    limit: String(limit),
  })

  const response = await fetch(`/api/search?${params.toString()}`, {
    cache: 'no-store',
  })
  const payload = await parseResponse<SearchApiResponse>(response)

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Failed to search articles')
  }

  return payload.data?.results.map((result) => result.article) || []
}

export async function fetchPublishedArticleBySlug(
  slug: string,
  targetAudience: TargetAudience
): Promise<Article | null> {
  const params = new URLSearchParams({
    slug,
    targetAudience,
  })

  const response = await fetch(`/api/articles/by-slug?${params.toString()}`, {
    cache: 'no-store',
  })

  if (response.status === 404) {
    return null
  }

  const payload = await parseResponse<ArticleBySlugApiResponse>(response)

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Failed to fetch article')
  }

  return payload.article || null
}
