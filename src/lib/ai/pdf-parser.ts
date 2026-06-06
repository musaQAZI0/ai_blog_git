// Note: pdf-parse should be used on the server side only
import pdf from 'pdf-parse'
import { LRUCache } from 'lru-cache'
import crypto from 'crypto'

// ⚡ OPTIMIZATION: Cache parsed PDF text to avoid re-parsing same files
// Max 50 PDFs in cache, each entry expires after 1 hour
const pdfCache = new LRUCache<string, string>({
  max: 50,
  ttl: 1000 * 60 * 60, // 1 hour
  maxSize: 50 * 1024 * 1024, // 50MB total cache size
  sizeCalculation: (value) => value.length,
})

// Suppress harmless font-table warnings from pdfjs (e.g. "Required 'glyf' table is not found")
// These appear when PDFs use embedded fonts without a complete glyph table and don't affect extraction.
const _origWarn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : ''
  if (msg.includes('glyf') || msg.includes('cmap') || msg.includes('Required') && msg.includes('table')) return
  _origWarn(...args)
}


type PdfTextItem = {
  str: string
  width?: number
  transform?: number[]
}

type PositionedTextItem = {
  text: string
  x: number
  y: number
  width: number
}

function median(values: number[]): number {
  if (values.length === 0) return 4
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] || 0) + (sorted[middle] || 0)) / 2
    : sorted[middle] || 4
}

function groupItemsByLine(items: PositionedTextItem[]): PositionedTextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: PositionedTextItem[][] = []
  const yTolerance = 2

  for (const item of sorted) {
    const lastLine = lines[lines.length - 1]
    if (lastLine && Math.abs((lastLine[0]?.y || 0) - item.y) <= yTolerance) {
      lastLine.push(item)
    } else {
      lines.push([item])
    }
  }

  return lines.map((line) => line.sort((a, b) => a.x - b.x))
}

function renderLineWithLayout(line: PositionedTextItem[], charWidth: number): string {
  let text = ''
  let cursor = 0
  const minX = Math.min(...line.map((item) => item.x))

  for (const item of line) {
    const target = Math.max(0, Math.round((item.x - minX) / charWidth))
    const neededSpaces = Math.max(1, target - cursor)
    if (text.length > 0) text += ' '.repeat(neededSpaces)
    text += item.text
    cursor = target + Math.max(1, Math.round(item.width / charWidth))
  }

  return text.replace(/[ \t]+$/g, '')
}

async function renderPageWithLayout(pageData: any): Promise<string> {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  })

  const items = (textContent.items || [])
    .map((item: PdfTextItem): PositionedTextItem | null => {
      const text = (item.str || '').trim()
      const transform = item.transform || []
      const x = Number(transform[4])
      const y = Number(transform[5])
      if (!text || !Number.isFinite(x) || !Number.isFinite(y)) return null
      return {
        text,
        x,
        y,
        width: typeof item.width === 'number' && item.width > 0 ? item.width : text.length * 4,
      }
    })
    .filter(Boolean) as PositionedTextItem[]

  const charWidth = Math.max(
    2.5,
    Math.min(
      8,
      median(items
        .filter((item) => item.text.length > 0 && item.width > 0)
        .map((item) => item.width / Math.max(1, item.text.length)))
    )
  )

  return groupItemsByLine(items)
    .map((line) => renderLineWithLayout(line, charWidth))
    .filter((line) => line.trim())
    .join('\n')
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // ⚡ OPTIMIZATION: Check cache first to avoid re-parsing same PDF
  const bufferHash = crypto.createHash('sha256').update(buffer).digest('hex')

  const cached = pdfCache.get(bufferHash)
  if (cached) {
    console.log('[pdf-parser] ✅ Cache hit - returning cached text')
    return cached
  }

  console.log('[pdf-parser] Cache miss - parsing PDF...')

  try {
    const data = await pdf(buffer, {
      pagerender: renderPageWithLayout,
    })

    // Cache the parsed text for future requests
    pdfCache.set(bufferHash, data.text)
    console.log(`[pdf-parser] Cached PDF text (${data.text.length} chars)`)

    return data.text
  } catch (error) {
    console.error('PDF parsing error:', error)
    throw new Error('Failed to parse PDF file')
  }
}

export async function extractTextFromMultiplePDFs(
  buffers: Buffer[]
): Promise<string> {
  const texts = await Promise.all(
    buffers.map((buffer) => extractTextFromPDF(buffer))
  )
  return texts.join('\n\n---\n\n')
}
