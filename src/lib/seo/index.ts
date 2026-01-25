import { SEOMeta } from '@/types'

/**
 * Extract keywords from content using TF-IDF-like approach
 */
export function extractKeywords(content: string, maxKeywords: number = 10): string[] {
  // Remove HTML tags
  const cleanText = content.replace(/<[^>]*>/g, ' ')

  // Common Polish and English stop words
  const stopWords = new Set([
    'i', 'a', 'the', 'is', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
    'w', 'z', 'do', 'na', 'o', 'po', 'od', 'dla', 'oraz', 'ale', 'że', 'się',
    'jest', 'był', 'być', 'aby', 'lub', 'jak', 'jego', 'jej', 'ich', 'tym',
    'te', 'ta', 'to', 'są', 'było', 'były', 'była', 'ten', 'która', 'który',
  ])

  // Tokenize and clean
  // Replace non-letter characters (including Polish diacritics) with spaces
  const words = cleanText
    .toLowerCase()
    .replace(/[^a-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))

  // Count word frequency
  const wordFreq = new Map<string, number>()
  words.forEach((word) => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
  })

  // Sort by frequency and take top keywords
  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word)

  return sortedWords
}

/**
 * Calculate keyword density
 */
export function calculateKeywordDensity(content: string, keyword: string): number {
  const cleanText = content.replace(/<[^>]*>/g, ' ').toLowerCase()
  const words = cleanText.split(/\s+/)
  const keywordCount = words.filter((word) => word.includes(keyword.toLowerCase())).length
  return (keywordCount / words.length) * 100
}

/**
 * Generate meta description from content
 */
export function generateMetaDescription(content: string, maxLength: number = 160): string {
  // Remove HTML tags
  const cleanText = content.replace(/<[^>]*>/g, ' ')

  // Get first paragraph or sentence
  const sentences = cleanText.split(/\.\s+/)
  let description = sentences[0]

  // Truncate to max length
  if (description.length > maxLength) {
    description = description.substring(0, maxLength - 3).trim() + '...'
  }

  return description
}

/**
 * Generate SEO-friendly slug from title
 */
export function generateSEOSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60)
}

/**
 * Optimize heading structure
 */
export function optimizeHeadingStructure(content: string): {
  isValid: boolean
  issues: string[]
  h1Count: number
  h2Count: number
  h3Count: number
} {
  const h1Matches = content.match(/<h1[^>]*>.*?<\/h1>/gi) || []
  const h2Matches = content.match(/<h2[^>]*>.*?<\/h2>/gi) || []
  const h3Matches = content.match(/<h3[^>]*>.*?<\/h3>/gi) || []

  const issues: string[] = []

  if (h1Matches.length === 0) {
    issues.push('Brak nagłówka H1')
  } else if (h1Matches.length > 1) {
    issues.push('Więcej niż jeden nagłówek H1')
  }

  if (h2Matches.length === 0) {
    issues.push('Brak nagłówków H2')
  }

  return {
    isValid: issues.length === 0,
    issues,
    h1Count: h1Matches.length,
    h2Count: h2Matches.length,
    h3Count: h3Matches.length,
  }
}

/**
 * Calculate readability score (Flesch Reading Ease adapted for Polish)
 */
export function calculateReadabilityScore(content: string): {
  score: number
  level: 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard'
} {
  const cleanText = content.replace(/<[^>]*>/g, ' ')
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0)
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0)

  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, level: 'very-hard' }
  }

  const avgWordsPerSentence = words.length / sentences.length
  const avgSyllablesPerWord = syllables / words.length

  // Simplified Flesch formula
  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord

  let level: 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard'
  if (score >= 80) level = 'very-easy'
  else if (score >= 60) level = 'easy'
  else if (score >= 40) level = 'medium'
  else if (score >= 20) level = 'hard'
  else level = 'very-hard'

  return { score: Math.max(0, Math.min(100, score)), level }
}

/**
 * Count syllables in a word (simplified)
 */
function countSyllables(word: string): number {
  const vowels = 'aąeęioóuy'
  let count = 0
  let prevWasVowel = false

  for (const char of word.toLowerCase()) {
    const isVowel = vowels.includes(char)
    if (isVowel && !prevWasVowel) {
      count++
    }
    prevWasVowel = isVowel
  }

  return Math.max(1, count)
}

/**
 * Generate alt text for images
 */
export function generateImageAltText(title: string, context?: string): string {
  const base = `Ilustracja: ${title}`
  return context ? `${base} - ${context}` : base
}

/**
 * Generate Medical Article schema markup
 */
export function generateMedicalArticleSchema(
  title: string,
  description: string,
  author: string,
  publishedDate: Date,
  modifiedDate: Date,
  imageUrl?: string
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    headline: title,
    description: description,
    author: {
      '@type': 'Person',
      name: author,
    },
    datePublished: publishedDate.toISOString(),
    dateModified: modifiedDate.toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'Skrzypecki.pl',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
      },
    },
    ...(imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: imageUrl,
      },
    }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': process.env.NEXT_PUBLIC_APP_URL,
    },
  }
}

/**
 * Automatically optimize SEO metadata
 */
export function autoOptimizeSEO(
  title: string,
  content: string,
  currentMeta?: Partial<SEOMeta>
): SEOMeta {
  // Generate or use existing keywords
  const keywords = currentMeta?.keywords || extractKeywords(content, 10)

  // Generate meta description
  const description =
    currentMeta?.description || generateMetaDescription(content, 160)

  // Use provided OG image or placeholder
  const ogImage = currentMeta?.ogImage

  return {
    title: title.length > 60 ? title.substring(0, 57) + '...' : title,
    description,
    keywords,
    ogImage,
  }
}

/**
 * Validate internal links
 */
export function extractInternalLinks(content: string, domain: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi
  const links: string[] = []
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1]
    if (href.includes(domain) || href.startsWith('/')) {
      links.push(href)
    }
  }

  return links
}

/**
 * Generate comprehensive SEO report
 */
export function generateSEOReport(title: string, content: string): {
  score: number
  issues: string[]
  recommendations: string[]
  metrics: {
    titleLength: number
    contentLength: number
    keywordCount: number
    headingStructure: ReturnType<typeof optimizeHeadingStructure>
    readability: ReturnType<typeof calculateReadabilityScore>
  }
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Title check
  const titleLength = title.length
  if (titleLength < 30) {
    issues.push('Tytuł jest za krótki (mniej niż 30 znaków)')
  } else if (titleLength > 60) {
    issues.push('Tytuł jest za długi (więcej niż 60 znaków)')
  }

  // Content length check
  const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).length
  if (wordCount < 300) {
    issues.push('Treść jest za krótka (mniej niż 300 słów)')
    recommendations.push('Dodaj więcej szczegółowych informacji (docelowo 800-1500 słów)')
  }

  // Keyword extraction
  const keywords = extractKeywords(content)
  if (keywords.length < 5) {
    issues.push('Za mało unikalnych słów kluczowych')
  }

  // Heading structure
  const headingStructure = optimizeHeadingStructure(content)
  if (!headingStructure.isValid) {
    issues.push(...headingStructure.issues)
  }

  // Readability
  const readability = calculateReadabilityScore(content)
  if (readability.level === 'very-hard') {
    recommendations.push('Uprość język dla lepszej czytelności')
  }

  // Image alt text check
  const imgTags = content.match(/<img[^>]*>/gi) || []
  const imgsWithoutAlt = imgTags.filter((tag) => !tag.includes('alt=')).length
  if (imgsWithoutAlt > 0) {
    issues.push(`${imgsWithoutAlt} obrazów bez tekstu alt`)
  }

  // Calculate overall score
  let score = 100
  score -= issues.length * 10
  score -= recommendations.length * 5
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    issues,
    recommendations,
    metrics: {
      titleLength,
      contentLength: wordCount,
      keywordCount: keywords.length,
      headingStructure,
      readability,
    },
  }
}
