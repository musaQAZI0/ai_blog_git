// Note: pdf-parse should be used on the server side only
import pdf from 'pdf-parse'

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
    const line = lines.find((candidate) => Math.abs((candidate[0]?.y || 0) - item.y) <= yTolerance)
    if (line) {
      line.push(item)
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
  try {
    const data = await pdf(buffer, {
      pagerender: renderPageWithLayout,
    })
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
