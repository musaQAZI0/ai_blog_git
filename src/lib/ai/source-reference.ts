const SOURCE_SECTION_PATTERN =
  /^##\s*(Źródło|Zrodlo|Artykuł źródłowy|Artykul zrodlowy|Piśmiennictwo|Pismiennictwo|Bibliografia)\b/im

const ABSTRACT_SECTION_PATTERN =
  /^(abstract|abstrakt|streszczenie|summary|introduction|wstęp|wstep)\b/i

const JOURNAL_HINTS = [
  'journal',
  'ophthalmology',
  'ophthalmol',
  'cataract',
  'refract',
  'surg',
  'cornea',
  'retina',
  'glaucoma',
  'escrs',
  'jcrs',
]

function cleanLine(line: string): string {
  return line
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()
}

function scoreCandidate(candidate: string): number {
  const text = cleanLine(candidate)
  if (!text || text.length < 40 || text.length > 360) return -1
  if (ABSTRACT_SECTION_PATTERN.test(text)) return -1

  let score = 0

  if (/\b(?:19|20)\d{2}\b/.test(text)) score += 3
  if (/\b\d{1,4}\s*-\s*\d{1,4}\b/.test(text)) score += 3
  if (/\b(?:vol\.?|volume)\s*\d+\b/i.test(text)) score += 2
  if (/\b(?:issue|no\.?|number)\s*\d+\b/i.test(text)) score += 2
  if (/\bpages?\s+\d{1,4}\s*-\s*\d{1,4}\b/i.test(text)) score += 2

  const journalHintMatches = JOURNAL_HINTS.filter((hint) => text.toLowerCase().includes(hint)).length
  score += Math.min(3, journalHintMatches)

  const authorMatches = text.match(/\b(?:[A-Z]\.\s*){1,3}[A-ZŁŚŻŹĆŃÓ][a-ząćęłńóśźż-]+\b/g) || []
  if (authorMatches.length >= 2) score += 3
  else if (authorMatches.length === 1) score += 1

  if (/[A-ZŁŚŻŹĆŃÓ][a-ząćęłńóśźż-]+(?:\s+[A-ZŁŚŻŹĆŃÓ][a-ząćęłńóśźż-]+){3,}/.test(text)) {
    score += 1
  }

  return score
}

export function extractSourceReference(pdfContent: string): string | null {
  const primaryDocument = (pdfContent || '').split(/\n\s*---\s*\n/)[0] || ''
  const lines = primaryDocument
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)

  if (lines.length === 0) return null

  const boundaryIndex = lines.findIndex((line, index) => index > 0 && ABSTRACT_SECTION_PATTERN.test(line))
  const scopedLines = lines.slice(0, boundaryIndex > 0 ? boundaryIndex : Math.min(lines.length, 80))

  let bestCandidate: string | null = null
  let bestScore = -1

  for (let i = 0; i < scopedLines.length; i += 1) {
    for (let size = 1; size <= 3; size += 1) {
      const window = scopedLines.slice(i, i + size)
      if (window.length !== size) continue
      const candidate = cleanLine(window.join(' '))
      const score = scoreCandidate(candidate)

      if (score > bestScore) {
        bestScore = score
        bestCandidate = candidate
      }
    }
  }

  if (bestCandidate && bestScore >= 6) {
    return bestCandidate
  }

  const flattened = cleanLine(scopedLines.join(' '))
  const fallbackMatch = flattened.match(
    /((?:[A-Z]\.\s*){1,3}[A-ZŁŚŻŹĆŃÓ][a-ząćęłńóśźż-]+.*?\b(?:19|20)\d{2}\b.*?\b\d{1,4}\s*-\s*\d{1,4}\b)/i
  )

  return fallbackMatch ? cleanLine(fallbackMatch[1]) : null
}

export function appendSourceReferenceSection(content: string, pdfContent: string): string {
  const trimmedContent = (content || '').trim()
  if (!trimmedContent) return trimmedContent
  if (SOURCE_SECTION_PATTERN.test(trimmedContent)) return trimmedContent

  const citation = extractSourceReference(pdfContent)
  if (!citation) return trimmedContent
  if (trimmedContent.includes(citation)) return trimmedContent

  return `${trimmedContent}\n\n## Źródło\n\n- ${citation}`
}
