import Anthropic from '@anthropic-ai/sdk'
import { AIGenerationResponse, TargetAudience } from '@/types'

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  return new Anthropic({ apiKey })
}

const PATIENT_SYSTEM_PROMPT = `You are a medical content writer specializing in ophthalmology content for patients.
Write in simple, accessible Polish language. Avoid medical jargon or explain it when necessary.
Focus on being educational, reassuring, and practical.
Format the content with clear headings, bullet points where appropriate, and easy-to-understand explanations.`

const PROFESSIONAL_SYSTEM_PROMPT = `You are a medical content writer specializing in ophthalmology content for medical professionals.
Write in technical, clinical Polish language appropriate for doctors and optometrists.
Include relevant clinical details, research references, and professional terminology.
Format the content with proper medical structure and evidence-based information.`

export async function generateArticleWithClaude(
  pdfContent: string,
  targetAudience: TargetAudience
): Promise<AIGenerationResponse> {
  const systemPrompt = targetAudience === 'patient'
    ? PATIENT_SYSTEM_PROMPT
    : PROFESSIONAL_SYSTEM_PROMPT

  const userPrompt = `Based on the following medical document content, create a blog article in Polish.
Target word count: ~600 words for the main content (aim for 560-650).

Document content:
${pdfContent}

Please provide the output in the following JSON format (respond with only the JSON, no additional text):
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

  const anthropic = getAnthropicClient()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'

  // Extract JSON from response (Claude might include additional text)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : '{}'
  const articleData = JSON.parse(jsonStr)

  return {
    title: articleData.title || 'Untitled Article',
    content: articleData.content || '',
    excerpt: articleData.excerpt || '',
    seoMeta: articleData.seoMeta || {
      title: articleData.title || '',
      description: articleData.excerpt || '',
      keywords: [],
    },
    suggestedTags: articleData.suggestedTags || [],
    suggestedCategory: articleData.suggestedCategory || 'General',
    // Claude doesn't generate images - this would need a separate service
    generatedImageUrl: undefined,
  }
}

export async function improveContentWithClaude(
  content: string,
  targetAudience: TargetAudience
): Promise<string> {
  const anthropic = getAnthropicClient()
  const systemPrompt = targetAudience === 'patient'
    ? PATIENT_SYSTEM_PROMPT
    : PROFESSIONAL_SYSTEM_PROMPT

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Improve and enhance the following article content while maintaining the same message and information. Make it more engaging and well-structured. Return only the improved content:\n\n${content}`
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text : content
}

export async function generateSEOMetaWithClaude(
  title: string,
  content: string
): Promise<{ title: string; description: string; keywords: string[] }> {
  const anthropic = getAnthropicClient()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Generate SEO metadata for the following article in Polish. Respond with only JSON:

Title: ${title}
Content preview: ${content.slice(0, 1000)}

Required format:
{
  "title": "SEO title (max 60 chars)",
  "description": "Meta description (max 160 chars)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : '{}'

  try {
    return JSON.parse(jsonStr)
  } catch {
    return { title, description: '', keywords: [] }
  }
}
