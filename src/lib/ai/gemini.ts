import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIGenerationResponse, TargetAudience } from '@/types'
import { generateAndUploadImagen } from '@/lib/ai/gemini-imagen'

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenerativeAI(apiKey)
}

function getGeminiTextModel() {
  return process.env.GEMINI_TEXT_MODEL || 'gemini-2.0-pro'
}

function getFigurePlaceholderUrl(index: number) {
  return `https://www.google.com/search?q=%7B%7BFIGURE_${index}_URL%7D%7D`
}

const PATIENT_SYSTEM_PROMPT = `You are a medical content writer specializing in ophthalmology content for patients.
Write in simple, accessible Polish language. Avoid medical jargon or explain it when necessary.
Focus on being educational, reassuring, and practical.
Format the content with clear headings, bullet points where appropriate, and easy-to-understand explanations.`

const PROFESSIONAL_SYSTEM_PROMPT = `You are the Editor-in-Chief of a high-impact scientific journal specializing in ophthalmology.
Your task is to write a concise editorial review of the provided article, targeted specifically at ophthalmologists and optometrists.
Write in sophisticated, academic Polish appropriate for peer-reviewed literature.
Adopt an authoritative, analytical, and objective tone.
Structure the review to include:

Editorial Summary: A high-level synthesis of the article's subject.

Key Highlights: Extract the most important data points, specific study findings, statistical outcomes, or distinct clinical protocols found in the text.

Clinical Impact: Explicitly explain why this matters for daily practice (e.g., diagnostics, treatment efficacy, patient management).

Ground all claims strictly in the provided document content. If the document does not contain a detail, do not invent it.`

function extractJsonObject(text: string): string {
  const trimmed = (text || '').trim()
  if (!trimmed) return '{}'

  // Remove common code fences
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return '{}'
  return withoutFences.slice(firstBrace, lastBrace + 1)
}

export async function generateArticleWithGemini(
  pdfContent: string,
  targetAudience: TargetAudience,
  generateImage: boolean = true
): Promise<AIGenerationResponse> {
  const systemPrompt = targetAudience === 'patient'
    ? PATIENT_SYSTEM_PROMPT
    : PROFESSIONAL_SYSTEM_PROMPT

  const audienceInstructions =
    targetAudience === 'professional'
      ? `AudienceInstructions (professional):
- Use headings aligned with: **Streszczenie redakcyjne**, **Kluczowe informacje**, **Znaczenie kliniczne**.
- Extract only details present in the document (numbers, protocols, outcomes); do not invent details or citations.
`
      : `AudienceInstructions (patient):
- Keep language simple and reassuring.
- Explain any unavoidable medical terms briefly.
`

  const userPrompt = `Based on the following medical document content, create a blog article/review in Polish.
Target word count: ~400 words for the main content (aim for 380-450).
IMPORTANT: word count refers ONLY to the "content" field (the markdown article body), excluding title, excerpt, SEO meta, tags/categories, and excluding URLs/placeholders.

Document content: ${pdfContent}

IMPORTANT:
- Return a SINGLE valid JSON object (no markdown, no code fences, no extra text).
- In "content" markdown, include up to 3 figure placeholder URL tokens exactly once each where images should appear, e.g. ${getFigurePlaceholderUrl(1)}.
${audienceInstructions}

Required JSON format:
{
  "title": "Article title",
  "content": "Full article content in markdown format (must include placeholders like ${getFigurePlaceholderUrl(1)} where images should appear)",
  "excerpt": "A brief 2-3 sentence summary (max 160 characters)",
  "seoMeta": {
    "title": "SEO optimized title (max 60 characters)",
    "description": "SEO meta description (max 160 characters)",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "suggestedTags": ["tag1", "tag2"],
  "suggestedCategory": "Category name",
  "coverImagePrompt": "A short prompt for a cover image relevant to the article (no text on image).",
  "figures": [
    {
      "id": "figure_1",
      "type": "illustration|chart",
      "alt": "Alt text in Polish",
      "caption": "Short caption in Polish",
      "placeholder": "${getFigurePlaceholderUrl(1)}",
      "prompt": "Image generation prompt in English. If chart, include exact data and style instructions."
    }
  ]
}`

  const genAI = getGeminiClient()
  const modelName = getGeminiTextModel()

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    } as any,
    systemInstruction: systemPrompt as any,
  })

  const result = await model.generateContent(userPrompt)
  const responseText = result.response.text()
  const jsonStr = extractJsonObject(responseText)
  const articleData = JSON.parse(jsonStr)

  let generatedImageUrl: string | undefined
  let content: string = articleData.content || ''

  const figures: Array<{
    id?: string
    alt?: string
    caption?: string
    placeholder?: string
    prompt?: string
  }> = Array.isArray(articleData.figures) ? articleData.figures : []

  const canUseGeminiImages = Boolean(process.env.GEMINI_API_KEY)

  if (generateImage && canUseGeminiImages) {
    try {
      const coverPrompt: string =
        articleData.coverImagePrompt ||
        `Professional medical illustration related to ophthalmology for an article titled "${articleData.title}". Clean, modern medical aesthetic. No text in the image.`

      generatedImageUrl = await generateAndUploadImagen(
        coverPrompt,
        'cover',
        'ai-cover'
      )
    } catch (error) {
      console.error('Gemini cover image generation failed:', error)
    }

    const limitedFigures = figures.slice(0, 3)
    for (let i = 0; i < limitedFigures.length; i++) {
      const figure = limitedFigures[i]
      if (!figure?.prompt) continue

      try {
        const url = await generateAndUploadImagen(
          figure.prompt,
          figure.id || `figure-${i + 1}`,
          'ai-figure'
        )

        const placeholder = figure.placeholder || getFigurePlaceholderUrl(i + 1)
        if (content.includes(placeholder)) {
          content = content.split(placeholder).join(url)
        }
      } catch (error) {
        console.error('Gemini figure generation failed:', error)
      }
    }
  }

  return {
    title: articleData.title || 'Untitled Article',
    content,
    excerpt: articleData.excerpt || '',
    seoMeta: articleData.seoMeta || {
      title: articleData.title || '',
      description: articleData.excerpt || '',
      keywords: [],
    },
    suggestedTags: articleData.suggestedTags || [],
    suggestedCategory: articleData.suggestedCategory || 'General',
    generatedImageUrl,
  }
}

export async function improveContentWithGemini(
  content: string,
  targetAudience: TargetAudience
): Promise<string> {
  const systemPrompt = targetAudience === 'patient'
    ? PATIENT_SYSTEM_PROMPT
    : PROFESSIONAL_SYSTEM_PROMPT

  const genAI = getGeminiClient()
  const modelName = getGeminiTextModel()
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
    systemInstruction: systemPrompt as any,
  })

  const result = await model.generateContent(
    `Improve and enhance the following Polish article content while maintaining the same message and information. ` +
      `Make it more engaging and well-structured. Return only the improved markdown content:\n\n${content}`
  )

  return result.response.text() || content
}

