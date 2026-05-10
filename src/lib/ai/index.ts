import { generateArticleWithOpenAI, improveContent } from './openai'
import { generateArticleWithClaude, improveContentWithClaude } from './claude'
import { generateArticleWithGemini, improveContentWithGemini } from './gemini'
import { normalizeAIGenerationResponse } from './normalize'
import { AIGenerationMode, AIGenerationRequest, AIGenerationResponse, AIProvider } from '@/types'

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
        ? 22000
        : 9000
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
  const providerOrder = generationMode === 'fast' ? [provider] : PROVIDER_ORDER[provider]

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

        return normalizeAIGenerationResponse(result)
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
