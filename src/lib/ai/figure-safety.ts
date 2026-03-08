type FigureLike = {
  type?: string
  alt?: string
  caption?: string
  prompt?: string
  placeholder?: string
}

const TEXT_HEAVY_TERMS = [
  'chart',
  'graph',
  'table',
  'plot',
  'axis',
  'axes',
  'legend',
  'label',
  'labels',
  'numbers',
  'numerical',
  'data table',
  'bar chart',
  'line chart',
  'scatter',
  'histogram',
  'infographic',
]

const TEXT_FREE_IMAGE_REQUIREMENT =
  'Strict requirement: generate a clean medical illustration with no visible text, words, letters, numbers, labels, legends, axes, tables, UI, logos, or watermarks.'

export function isTextHeavyFigure(figure: FigureLike): boolean {
  const haystack = [
    figure.type || '',
    figure.alt || '',
    figure.caption || '',
    figure.prompt || '',
  ]
    .join(' ')
    .toLowerCase()

  return TEXT_HEAVY_TERMS.some((term) => haystack.includes(term))
}

export function buildTextSafeImagePrompt(prompt: string): string {
  const trimmed = (prompt || '').trim()
  if (!trimmed) return TEXT_FREE_IMAGE_REQUIREMENT

  const normalized = trimmed.toLowerCase()
  if (
    normalized.includes('no visible text') &&
    normalized.includes('no labels') &&
    normalized.includes('no numbers')
  ) {
    return trimmed
  }

  return `${trimmed}\n\n${TEXT_FREE_IMAGE_REQUIREMENT}`
}

export function removeFigurePlaceholder(content: string, placeholder: string): string {
  if (!content || !placeholder) return content

  return content
    .split(placeholder)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
