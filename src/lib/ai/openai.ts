import OpenAI from 'openai'
import { AIGenerationResponse, TargetAudience } from '@/types'

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({ apiKey })
}

const PATIENT_SYSTEM_PROMPT = `You are a medical content writer specializing in ophthalmology content for patients.
Write in simple, accessible Polish language. Avoid medical jargon or explain it when necessary.
Focus on being educational, reassuring, and practical.
Format the content with clear headings, bullet points where appropriate, and easy-to-understand explanations.`

const PROFESSIONAL_SYSTEM_PROMPT = `You are a medical content writer specializing in ophthalmology content for medical professionals.
Write in technical, clinical Polish language appropriate for doctors and optometrists.
Include relevant clinical details, research references, and professional terminology.
Format the content with proper medical structure and evidence-based information.`

export async function generateArticleWithOpenAI(
  pdfContent: string,
  targetAudience: TargetAudience,
  generateImage: boolean = true
): Promise<AIGenerationResponse> {
  const systemPrompt = targetAudience === 'patient'
    ? PATIENT_SYSTEM_PROMPT
    : PROFESSIONAL_SYSTEM_PROMPT

  const userPrompt = `Based on the following medical document content, create a blog article in Polish.

Document content:
${pdfContent}

Please provide the output in the following JSON format:
{
  "title": "Article title",
  "content": "Full article content in markdown format",
  "excerpt": "A brief 2-3 sentence summary (max 160 characters)",
  "seoMeta": {
    "title": "SEO optimized title (max 60 characters)",
    "description": "SEO meta description (max 160 characters)",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "suggestedTags": ["tag1", "tag2"],
  "suggestedCategory": "Category name"
}`

  const openai = getOpenAIClient()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 4000,
  })

  const responseText = completion.choices[0]?.message?.content || '{}'
  const articleData = JSON.parse(responseText)

  let generatedImageUrl: string | undefined

  if (generateImage) {
    try {
      const imageResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `Professional medical illustration for an ophthalmology article titled "${articleData.title}". Clean, modern, medical aesthetic. No text in the image.`,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
      })

      generatedImageUrl = imageResponse.data?.[0]?.url
    } catch (error) {
      console.error('Image generation failed:', error)
    }
  }

  return {
    title: articleData.title,
    content: articleData.content,
    excerpt: articleData.excerpt,
    seoMeta: articleData.seoMeta,
    suggestedTags: articleData.suggestedTags,
    suggestedCategory: articleData.suggestedCategory,
    generatedImageUrl,
  }
}

export async function improveContent(
  content: string,
  targetAudience: TargetAudience
): Promise<string> {
  const openai = getOpenAIClient()
  const systemPrompt = targetAudience === 'patient'
    ? PATIENT_SYSTEM_PROMPT
    : PROFESSIONAL_SYSTEM_PROMPT

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Improve and enhance the following article content while maintaining the same message and information. Make it more engaging and well-structured:\n\n${content}`
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  })

  return completion.choices[0]?.message?.content || content
}
