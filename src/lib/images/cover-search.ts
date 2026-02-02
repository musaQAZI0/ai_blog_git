import type { TargetAudience } from '@/types'

type CoverSearchInput = {
  title: string
  category?: string
  tags?: string[]
  targetAudience: TargetAudience
}

function buildSearchQuery(input: CoverSearchInput): string {
  const parts: string[] = []
  parts.push('ophthalmology')
  parts.push(input.title)
  if (input.category) parts.push(input.category)
  if (input.tags?.length) parts.push(...input.tags.slice(0, 5))
  parts.push(input.targetAudience === 'patient' ? 'patient education' : 'clinical')

  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchJson(url: string, timeoutMs: number = 8000): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: {
        // Wikimedia recommends setting a UA; keep it generic.
        'user-agent': 'ai-medical-blog/1.0 (cover search)',
      },
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Cover search failed (${res.status}): ${text || res.statusText}`)
    }
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

export async function findCoverImageUrl(input: CoverSearchInput): Promise<string | null> {
  const provider = (process.env.COVER_IMAGE_SEARCH_PROVIDER || 'wikimedia').toLowerCase()
  const query = buildSearchQuery(input)

  if (provider === 'unsplash') {
    // No-key fallback: returns a redirect to a "featured" image matching the query.
    return `https://source.unsplash.com/featured/1200x675/?${encodeURIComponent(query)}`
  }

  // Default: Wikimedia Commons file search (free-to-use assets, but you should still review licensing).
  // We search the File namespace (ns=6) and request a 1200px thumbnail URL.
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrnamespace: '6',
      gsrlimit: '8',
      gsrsearch: query,
      prop: 'imageinfo',
      iiprop: 'url|mime',
      iiurlwidth: '1200',
    }).toString()

  try {
    const json = await fetchJson(url)
    const pages = json?.query?.pages
    if (!pages) return null

    const candidates = Object.values(pages) as any[]
    for (const page of candidates) {
      const info = page?.imageinfo?.[0]
      const mime = info?.mime as string | undefined
      const thumb = (info?.thumburl || info?.url) as string | undefined
      if (thumb && (!mime || mime.startsWith('image/'))) {
        return thumb
      }
    }
  } catch (error) {
    console.warn('Cover search error:', error)
  }

  // Last resort: still return a dynamic topic-based image URL rather than a hardcoded list.
  return `https://source.unsplash.com/featured/1200x675/?${encodeURIComponent(query)}`
}

