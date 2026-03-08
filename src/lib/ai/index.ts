import { generateArticleWithOpenAI, improveContent } from './openai'
import { generateArticleWithClaude, improveContentWithClaude } from './claude'
import { generateArticleWithGemini, improveContentWithGemini } from './gemini'
import { normalizeAIGenerationResponse } from './normalize'
import { appendSourceReferenceSection } from './source-reference'
import { AIGenerationRequest, AIGenerationResponse, AIProvider } from '@/types'

export async function generateArticle(
  request: AIGenerationRequest
): Promise<AIGenerationResponse> {
  const { pdfContent, targetAudience, provider, generateImage } = request

  const withSourceReference = (response: AIGenerationResponse) => ({
    ...response,
    content: appendSourceReferenceSection(response.content, pdfContent),
  })

  if (provider === 'openai') {
    return normalizeAIGenerationResponse(
      withSourceReference(await generateArticleWithOpenAI(pdfContent, targetAudience, generateImage))
    )
  }
  if (provider === 'gemini') {
    return normalizeAIGenerationResponse(
      withSourceReference(await generateArticleWithGemini(pdfContent, targetAudience, generateImage))
    )
  } else {
    return normalizeAIGenerationResponse(
      withSourceReference(await generateArticleWithClaude(pdfContent, targetAudience))
    )
  }
}

export async function improveArticleContent(
  content: string,
  targetAudience: 'patient' | 'professional',
  provider: AIProvider
): Promise<string> {
  if (provider === 'openai') {
    return improveContent(content, targetAudience)
  }
  if (provider === 'gemini') {
    return improveContentWithGemini(content, targetAudience)
  } else {
    return improveContentWithClaude(content, targetAudience)
  }
}

export { generateArticleWithOpenAI, generateArticleWithClaude, generateArticleWithGemini }
