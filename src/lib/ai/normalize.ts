import { AIGenerationResponse, SEOMeta } from '@/types'

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first === -1 || last <= first) return null
  const candidate = trimmed.slice(first, last + 1)
  try {
    const parsed = JSON.parse(candidate)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function normalizeSeoMeta(input: unknown, fallback?: SEOMeta): SEOMeta {
  const base: SEOMeta = fallback || { title: '', description: '', keywords: [] }

  if (!input) return base
  if (typeof input === 'string') {
    const parsed = extractJsonObject(input)
    return parsed ? normalizeSeoMeta(parsed, base) : base
  }
  if (typeof input !== 'object') return base

  const meta = input as Record<string, unknown>
  const titleRaw = meta.title
  const descRaw = meta.description
  const keywordsRaw = meta.keywords

  const parseMaybeJson = (value: unknown): Record<string, unknown> | null =>
    typeof value === 'string' ? extractJsonObject(value) : null

  const titleParsed = parseMaybeJson(titleRaw)
  const descParsed = parseMaybeJson(descRaw)

  const keywords =
    Array.isArray(keywordsRaw)
      ? (keywordsRaw.filter((k) => typeof k === 'string') as string[])
      : typeof keywordsRaw === 'string'
        ? keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean)
        : base.keywords

  return {
    title:
      (typeof titleRaw === 'string' ? titleRaw : '') ||
      (titleParsed && typeof titleParsed.title === 'string' ? titleParsed.title : '') ||
      base.title,
    description:
      (typeof descRaw === 'string' ? descRaw : '') ||
      (descParsed && typeof descParsed.description === 'string' ? descParsed.description : '') ||
      base.description,
    keywords,
  }
}

function parseNestedFields(value: string): Record<string, unknown> | null {
  if (!value) return null
  const nested = extractJsonObject(value)
  return nested
}

function extractLooseJsonString(raw: string, key: string): string | null {
  const pattern = `"${key}"`
  const idx = raw.indexOf(pattern)
  if (idx === -1) return null

  let i = raw.indexOf(':', idx + pattern.length)
  if (i === -1) return null
  i += 1

  while (i < raw.length && /\s/.test(raw[i]!)) i += 1
  if (raw[i] !== '"') return null
  i += 1

  let out = ''
  let escaped = false
  for (; i < raw.length; i += 1) {
    const ch = raw[i]!
    if (escaped) {
      if (ch === 'n') out += '\n'
      else if (ch === 'r') out += '\r'
      else if (ch === 't') out += '\t'
      else if (ch === '"') out += '"'
      else if (ch === '\\') out += '\\'
      else if (ch === 'u') {
        const hex = raw.slice(i + 1, i + 5)
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16))
          i += 4
        }
      } else {
        out += ch
      }
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      return out
    }
    out += ch
  }

  // Unterminated string, return best effort.
  return out.trim() ? out : null
}

function extractLooseArray(raw: string, key: string): string[] {
  const pattern = `"${key}"`
  const idx = raw.indexOf(pattern)
  if (idx === -1) return []

  let i = raw.indexOf('[', idx + pattern.length)
  if (i === -1) return []
  i += 1

  const items: string[] = []
  let current = ''
  let inString = false
  let escaped = false

  for (; i < raw.length; i += 1) {
    const ch = raw[i]!
    if (escaped) {
      if (ch === 'n') current += '\n'
      else if (ch === 'r') current += '\r'
      else if (ch === 't') current += '\t'
      else if (ch === '"') current += '"'
      else if (ch === '\\') current += '\\'
      else if (ch === 'u') {
        const hex = raw.slice(i + 1, i + 5)
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          current += String.fromCharCode(parseInt(hex, 16))
          i += 4
        }
      } else {
        current += ch
      }
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      if (!inString) {
        if (current.trim()) items.push(current.trim())
        current = ''
      }
      continue
    }
    if (inString) {
      current += ch
      continue
    }
    if (ch === ']') break
  }

  return items
}

function extractObjectSection(raw: string, key: string): string | null {
  const pattern = `"${key}"`
  const idx = raw.indexOf(pattern)
  if (idx === -1) return null
  let i = raw.indexOf('{', idx + pattern.length)
  if (i === -1) return null

  let depth = 0
  let inString = false
  let escaped = false
  for (let j = i; j < raw.length; j += 1) {
    const ch = raw[j]!
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        return raw.slice(i, j + 1)
      }
    }
  }

  return raw.slice(i)
}

export function normalizeAIGenerationResponse(
  response: AIGenerationResponse
): AIGenerationResponse {
  let title = typeof response.title === 'string' ? response.title : ''
  let content = typeof response.content === 'string' ? response.content : ''
  let excerpt = typeof response.excerpt === 'string' ? response.excerpt : ''
  let suggestedTags = response.suggestedTags || []
  let suggestedCategory = response.suggestedCategory || ''
  let generatedImageUrl = response.generatedImageUrl
  let seoMeta = normalizeSeoMeta(response.seoMeta)

  const nestedSource = [content, title, excerpt, seoMeta.title, seoMeta.description]
    .filter((v) => typeof v === 'string' && v.includes('{'))
    .sort((a, b) => b.length - a.length)[0]

  const nested =
    (nestedSource ? parseNestedFields(nestedSource) : null) ||
    parseNestedFields(title) ||
    parseNestedFields(content) ||
    parseNestedFields(excerpt)

  if (nested) {
    if (typeof nested.title === 'string') title = nested.title
    if (typeof nested.content === 'string') content = nested.content
    if (typeof nested.excerpt === 'string') excerpt = nested.excerpt

    if (nested.seoMeta) {
      seoMeta = normalizeSeoMeta(nested.seoMeta, seoMeta)
    }

    if (Array.isArray(nested.suggestedTags)) {
      suggestedTags = nested.suggestedTags.filter((t) => typeof t === 'string') as string[]
    }

    if (typeof nested.suggestedCategory === 'string') {
      suggestedCategory = nested.suggestedCategory
    }

    if (typeof nested.generatedImageUrl === 'string') {
      generatedImageUrl = nested.generatedImageUrl
    }
  }

  if (nestedSource && nestedSource.includes('"content"')) {
    const looseTitle = extractLooseJsonString(nestedSource, 'title')
    const looseContent = extractLooseJsonString(nestedSource, 'content')
    const looseExcerpt = extractLooseJsonString(nestedSource, 'excerpt')
    const seoSection = extractObjectSection(nestedSource, 'seoMeta') || ''
    const looseSeoTitle = seoSection ? extractLooseJsonString(seoSection, 'title') : null
    const looseSeoDesc = seoSection ? extractLooseJsonString(seoSection, 'description') : null
    const looseTags = extractLooseArray(nestedSource, 'suggestedTags')
    const looseCategory = extractLooseJsonString(nestedSource, 'suggestedCategory')
    const looseKeywords = seoSection ? extractLooseArray(seoSection, 'keywords') : []

    if (title.trim().startsWith('{') && looseTitle) title = looseTitle
    if (content.trim().startsWith('{') && looseContent) content = looseContent
    if (excerpt.trim().startsWith('{') && looseExcerpt) excerpt = looseExcerpt

    if (looseSeoTitle || looseSeoDesc || looseKeywords.length) {
      seoMeta = {
        title: looseSeoTitle || seoMeta.title,
        description: looseSeoDesc || seoMeta.description,
        keywords: looseKeywords.length ? looseKeywords : seoMeta.keywords,
      }
    }

    if (looseTags.length && suggestedTags.length === 0) suggestedTags = looseTags
    if (looseCategory && !suggestedCategory) suggestedCategory = looseCategory
  }

  // If SEO fields still contain JSON blobs, unwrap once more.
  seoMeta = normalizeSeoMeta(seoMeta)

  if (content) {
    content = content
      .replace(/\{\{FIGURE_\d+_URL\}\}/g, '')
      .replace(/https?:\/\/www\.google\.com\/search\?q=%7B%7BFIGURE_\d+_URL%7D%7D/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return {
    ...response,
    title,
    content,
    excerpt,
    seoMeta,
    suggestedTags,
    suggestedCategory,
    generatedImageUrl,
  }
}
