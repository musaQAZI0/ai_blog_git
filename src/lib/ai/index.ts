import { generateArticleWithOpenAI, improveContent } from './openai'
import { generateArticleWithClaude, improveContentWithClaude } from './claude'
import { AIGenerationRequest, AIGenerationResponse, AIProvider } from '@/types'

export async function generateArticle(
  request: AIGenerationRequest
): Promise<AIGenerationResponse> {
  const { pdfContent, targetAudience, provider, generateImage } = request

  if (provider === 'openai') {
    return generateArticleWithOpenAI(pdfContent, targetAudience, generateImage)
  } else {
    return generateArticleWithClaude(pdfContent, targetAudience)
  }
}

export async function improveArticleContent(
  content: string,
  targetAudience: 'patient' | 'professional',
  provider: AIProvider
): Promise<string> {
  if (provider === 'openai') {
    return improveContent(content, targetAudience)
  } else {
    return improveContentWithClaude(content, targetAudience)
  }
}

export { generateArticleWithOpenAI, generateArticleWithClaude }
