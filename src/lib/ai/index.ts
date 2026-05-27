import { generateArticleWithOpenAI, improveContent } from './openai'
import { generateArticleWithClaude, improveContentWithClaude } from './claude'
import { generateArticleWithGemini, improveContentWithGemini } from './gemini'
import { normalizeAIGenerationResponse } from './normalize'
import { AIGenerationMode, AIGenerationRequest, AIGenerationResponse, AIProvider } from '@/types'

function extractDoi(pdfContent: string): string | null {
  const match = (pdfContent || '').match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i)
  return match ? match[0].replace(/[.,;)]$/, '') : null
}

function cleanGeneratedProfessionalContent(content: string, pdfContent: string): string {
  let cleaned = (content || '').trim()
  if (!cleaned) return cleaned

  const doi = extractDoi(pdfContent)

  cleaned = cleaned
    // Chart captions sometimes get glued to preceding prose after placeholder replacement.
    .replace(/([.)])(?=(?:pooperacyjn|srednie|średnie|zakres funkcjonalnej|funkcjonalna gle|funkcjonalna gł))/gi, '$1\n\n')
    // Avoid overstating statistical differences as clinically important when the source only supports a modest effect.
    .replace(/klinicznie istotn(?:ą|a) popraw(?:ę|a) widzenia w odległościach pośrednich/gi, 'statystycznie istotną, umiarkowaną poprawę DCIVA')
    .replace(/klinicznie istotn(?:ą|a) popraw(?:ę|a) widzenia pośredniego/gi, 'statystycznie istotną, umiarkowaną poprawę DCIVA')
    // Keep Vivity contrast wording aligned with the paper's discussion.
    .replace(
      /Ceną za ten zakres jest jednak obniżona czułość na kontrast\./gi,
      'Czułość na kontrast była statystycznie niższa w grupie Vivity, jednak różnica bezwzględna była mała i według autorów prawdopodobnie nieistotna klinicznie.'
    )
    .replace(/\n{3,}/g, '\n\n')

  if (doi) {
    cleaned = cleaned
      .replace(/\s+Pages\s+S?\d{5,}\b/gi, ` doi:${doi}`)
      .replace(/\s+Pages\s+\d+\s*$/gim, ` doi:${doi}`)
      .replace(new RegExp(`doi:${doi}\\s+doi:${doi}`, 'gi'), `doi:${doi}`)
  }

  return cleaned.trim()
}

function countWords(text: string): number {
  return (text || '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#*_>`\-[\](){}]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function isJsonishText(text: string): boolean {
  const trimmed = (text || '').trim()
  return (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed.includes('{"title"') ||
    trimmed.includes('"content"') ||
    trimmed.includes('"seoMeta"')
  )
}

function assertUsableArticleResponse(
  article: AIGenerationResponse,
  targetAudience: AIGenerationRequest['targetAudience']
): void {
  const title = (article.title || '').trim()
  const content = (article.content || '').trim()
  const excerpt = (article.excerpt || '').trim()
  const wordCount = countWords(content)
  const minimumWords = targetAudience === 'professional' ? 260 : 170
  const hasSourceSection =
    targetAudience !== 'professional' ||
    /\u0179r\u00f3d\u0142o|Zrodlo|Source/i.test(content)

  const problems: string[] = []

  if (title.length < 12 || isJsonishText(title)) problems.push('invalid title')
  if (content.length < 900 || wordCount < minimumWords || isJsonishText(content)) {
    problems.push('invalid or too short content')
  }
  if (excerpt && isJsonishText(excerpt)) problems.push('invalid excerpt')
  if (!hasSourceSection) problems.push('missing source section')

  if (problems.length > 0) {
    throw new Error(`Generated article response failed quality checks: ${problems.join(', ')}`)
  }
}

const PROVIDER_ORDER: Record<AIProvider, AIProvider[]> = {
  gemini: ['gemini', 'openai', 'claude'],
  openai: ['openai', 'claude', 'gemini'],
  claude: ['claude', 'openai', 'gemini'],
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isProviderConfigured(provider: AIProvider): boolean {
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY)
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY)
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

function preparePdfContentForGeneration(
  pdfContent: string,
  targetAudience: AIGenerationRequest['targetAudience'],
  generationMode: AIGenerationMode
): string {
  const normalized = (pdfContent || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
  // Professional PDFs often place primary result tables after methods and baseline
  // characteristics. Keep the full normalized extraction window so chart parsing
  // does not clip later outcome tables.
  // Mobile: smaller limits for fast generation
  // Desktop full mode: larger limits for comprehensive generation with charts/images
  // Desktop fast mode: smaller limits (fallback)
  const maxChars =
    generationMode === 'fast'
      ? targetAudience === 'professional'
        ? 14000
        : 7000
      : targetAudience === 'professional'
        ? 55000 // Increased from 45000 for desktop professional full mode
        : 18000 // Increased from 14000 for desktop patient full mode
  return normalized.slice(0, maxChars)
}

function isRetryableGenerationError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error || '')).toLowerCase()

  return [
    '503',
    'service unavailable',
    'high demand',
    'temporarily unavailable',
    'timeout',
    'timed out',
    'etimedout',
    'aborted',
    'econnreset',
    'socket hang up',
    'overloaded',
    'rate limit',
    '429',
  ].some((needle) => message.includes(needle))
}

async function generateWithProvider(
  provider: AIProvider,
  pdfContent: string,
  targetAudience: AIGenerationRequest['targetAudience'],
  generateImage: boolean,
  generationMode: AIGenerationMode
): Promise<AIGenerationResponse> {
  if (provider === 'openai')
  {
    return generateArticleWithOpenAI(pdfContent, targetAudience, generateImage, generationMode)
  }
  if (provider === 'gemini')
  {
    return generateArticleWithGemini(pdfContent, targetAudience, generateImage, generationMode)
  }
  return generateArticleWithClaude(pdfContent, targetAudience, generateImage)
}

export async function generateArticle(
  request: AIGenerationRequest
): Promise<AIGenerationResponse> {
  const { pdfContent, targetAudience, provider, generateImage, generationMode = 'full' } = request
  const preparedPdfContent = preparePdfContentForGeneration(pdfContent, targetAudience, generationMode)
  const attemptedErrors: string[] = []
  const providerOrder = generationMode === 'fast'
    ? [provider, ...PROVIDER_ORDER[provider].filter((candidate) => candidate !== provider)]
    : PROVIDER_ORDER[provider]

  for (const candidate of providerOrder)
  {
    if (!isProviderConfigured(candidate))
    {
      attemptedErrors.push(`${candidate}: provider not configured`)
      continue
    }

    const maxAttempts = generationMode === 'fast' ? 1 : candidate === provider ? 2 : 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++)
    {
      try
      {
        if (candidate !== provider)
        {
          console.warn(`[ai] Falling back from ${provider} to ${candidate}`)
        }

        const result = await generateWithProvider(
          candidate,
          preparedPdfContent,
          targetAudience,
          generateImage,
          generationMode
        )

        const normalized = normalizeAIGenerationResponse(result)
        if (targetAudience === 'professional') {
          normalized.content = cleanGeneratedProfessionalContent(normalized.content, preparedPdfContent)
        }
        assertUsableArticleResponse(normalized, targetAudience)
        return normalized
      } catch (error)
      {
        const message = error instanceof Error ? error.message : String(error || 'Unknown error')
        attemptedErrors.push(`${candidate} attempt ${attempt}: ${message}`)

        const shouldRetry = attempt < maxAttempts && isRetryableGenerationError(error)
        if (!shouldRetry) break

        const backoffMs = attempt * 1500
        console.warn(`[ai] ${candidate} attempt ${attempt} failed, retrying in ${backoffMs}ms`)
        await delay(backoffMs)
      }
    }
  }

  throw new Error(
    `Article generation failed after retries and fallbacks. ${attemptedErrors.join(' | ')}`
  )
}

export async function improveArticleContent(
  content: string,
  targetAudience: 'patient' | 'professional',
  provider: AIProvider
): Promise<string> {
  if (provider === 'openai')
  {
    return improveContent(content, targetAudience)
  }
  if (provider === 'gemini')
  {
    return improveContentWithGemini(content, targetAudience)
  } else
  {
    return improveContentWithClaude(content, targetAudience)
  }
}

export { generateArticleWithOpenAI, generateArticleWithClaude, generateArticleWithGemini }
