import { Article, TargetAudience } from '@/types'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase/config'

export interface SearchOptions {
  query: string
  targetAudience?: TargetAudience
  category?: string
  tags?: string[]
  limit?: number
}

export interface SearchResult {
  article: Article
  score: number
  highlights: string[]
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(article: Article, searchQuery: string): number {
  const query = searchQuery.toLowerCase()
  let score = 0

  // Title match (highest weight)
  if (article.title.toLowerCase().includes(query)) {
    score += 100
    // Exact match bonus
    if (article.title.toLowerCase() === query) {
      score += 50
    }
  }

  // Keyword match
  const titleWords = article.title.toLowerCase().split(/\s+/)
  const queryWords = query.split(/\s+/)
  const matchingWords = titleWords.filter((word) => queryWords.includes(word))
  score += matchingWords.length * 20

  // Excerpt match
  if (article.excerpt.toLowerCase().includes(query)) {
    score += 50
  }

  // Tag match
  if (article.tags?.some((tag) => tag.toLowerCase().includes(query))) {
    score += 30
  }

  // Category match
  if (article.category.toLowerCase().includes(query)) {
    score += 40
  }

  // Content match (lower weight, as it's less visible)
  if (article.content.toLowerCase().includes(query)) {
    score += 20
  }

  // SEO keywords match
  if (article.seoMeta.keywords?.some((kw) => kw.toLowerCase().includes(query))) {
    score += 25
  }

  // Boost recent articles
  const daysSincePublished = article.publishedAt
    ? (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
    : 999
  if (daysSincePublished < 30) {
    score += 10
  }

  // Boost popular articles
  if (article.viewCount > 100) {
    score += Math.min(article.viewCount / 10, 50)
  }

  return score
}

/**
 * Generate highlights for search results
 */
function generateHighlights(article: Article, searchQuery: string, maxHighlights: number = 3): string[] {
  const query = searchQuery.toLowerCase()
  const highlights: string[] = []

  // Title highlight
  if (article.title.toLowerCase().includes(query)) {
    highlights.push(article.title)
  }

  // Excerpt highlight
  if (article.excerpt.toLowerCase().includes(query)) {
    highlights.push(article.excerpt)
  }

  // Content highlights
  const content = article.content.replace(/<[^>]*>/g, ' ')
  const sentences = content.split(/[.!?]+/)

  for (const sentence of sentences) {
    if (highlights.length >= maxHighlights) break
    if (sentence.toLowerCase().includes(query) && sentence.length > 50) {
      const trimmed = sentence.trim().substring(0, 150)
      highlights.push(trimmed + (sentence.length > 150 ? '...' : ''))
    }
  }

  return highlights
}

/**
 * Search articles (client-side filtering)
 * For production, consider using Algolia, ElasticSearch, or Typesense
 */
export async function searchArticles(options: SearchOptions): Promise<SearchResult[]> {
  const { query: searchQuery, targetAudience, category, tags, limit: resultLimit = 20 } = options

  if (!searchQuery || searchQuery.length < 2) {
    return []
  }

  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }

  // Fetch published articles
  let articlesQuery = query(
    collection(db, 'articles'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(100) // Fetch more to filter client-side
  )

  if (targetAudience) {
    articlesQuery = query(articlesQuery, where('targetAudience', '==', targetAudience))
  }

  if (category) {
    articlesQuery = query(articlesQuery, where('category', '==', category))
  }

  const snapshot = await getDocs(articlesQuery)

  const articles = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
    publishedAt: doc.data().publishedAt?.toDate(),
  })) as Article[]

  // Filter by tags if specified
  let filteredArticles = articles
  if (tags && tags.length > 0) {
    filteredArticles = articles.filter((article) =>
      tags.some((tag) => article.tags?.includes(tag))
    )
  }

  // Calculate relevance scores
  const results: SearchResult[] = filteredArticles
    .map((article) => ({
      article,
      score: calculateRelevanceScore(article, searchQuery),
      highlights: generateHighlights(article, searchQuery),
    }))
    .filter((result) => result.score > 0) // Only include results with some relevance
    .sort((a, b) => b.score - a.score) // Sort by relevance
    .slice(0, resultLimit)

  return results
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(
  prefix: string,
  targetAudience?: TargetAudience,
  maxSuggestions: number = 5
): Promise<string[]> {
  if (!prefix || prefix.length < 2) {
    return []
  }

  if (!isFirebaseConfigured || !db) {
    return []
  }

  // Fetch recent articles
  let articlesQuery = query(
    collection(db, 'articles'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(50)
  )

  if (targetAudience) {
    articlesQuery = query(articlesQuery, where('targetAudience', '==', targetAudience))
  }

  const snapshot = await getDocs(articlesQuery)
  const articles = snapshot.docs.map((doc) => doc.data())

  // Extract potential suggestions
  const suggestions = new Set<string>()

  articles.forEach((article: any) => {
    // Add matching title words
    const titleWords = article.title.toLowerCase().split(/\s+/)
    titleWords.forEach((word: string) => {
      if (word.startsWith(prefix.toLowerCase()) && word.length > 3) {
        suggestions.add(word)
      }
    })

    // Add matching tags
    article.tags?.forEach((tag: string) => {
      if (tag.toLowerCase().startsWith(prefix.toLowerCase())) {
        suggestions.add(tag)
      }
    })

    // Add matching keywords
    article.seoMeta?.keywords?.forEach((keyword: string) => {
      if (keyword.toLowerCase().startsWith(prefix.toLowerCase())) {
        suggestions.add(keyword)
      }
    })
  })

  return Array.from(suggestions).slice(0, maxSuggestions)
}

/**
 * Get popular search terms
 */
export function getPopularSearchTerms(): string[] {
  // This would typically come from analytics or a database
  // For now, return static popular medical terms
  return [
    'zaćma',
    'jaskra',
    'AMD',
    'krótkowzroczność',
    'nadwzroczność',
    'astygmatyzm',
    'retinopatia cukrzycowa',
    'soczewki kontaktowe',
    'laserowa korekcja wzroku',
    'badanie wzroku',
  ]
}
