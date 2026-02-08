import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIGenerationResponse, TargetAudience } from '@/types'
import { generateAndUploadImagen } from '@/lib/ai/gemini-imagen'
import { findCoverImageUrl } from '@/lib/images/cover-search'

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenerativeAI(apiKey)
}

function getGeminiTextModel() {
  // Note: availability depends on your API key + API version (this SDK uses v1beta).
  // If you set an unsupported model, we will attempt fallbacks at runtime.
  return process.env.GEMINI_TEXT_MODEL || 'gemini-pro-latest'
}

function getFigurePlaceholderUrl(index: number) {
  return `https://www.google.com/search?q=%7B%7BFIGURE_${index}_URL%7D%7D`
}

type GeminiListModelsResponse = {
  models?: Array<{
    name?: string
    supportedGenerationMethods?: string[]
  }>
}

async function listAvailableTextModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: {
      'x-goog-api-key': apiKey,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `[gemini] ListModels failed (${res.status}): ${text || res.statusText}. ` +
        `Verify your GEMINI_API_KEY is a Google AI Studio/Generative Language key and that the API is enabled for the project.`
    )
  }

  const data = (await res.json()) as GeminiListModelsResponse
  const models = Array.isArray(data.models) ? data.models : []

  return models
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => (m.name || '').replace(/^models\//, ''))
    .filter(Boolean)
}

function pickFallbackModel(available: string[], preferred: 'pro' | 'flash'): string | null {
  const normalized = new Set(available)
  const candidates =
    preferred === 'flash'
      ? [
          'gemini-3-flash-preview',
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-flash-latest',
          'gemini-2.5-flash-lite',
          'gemini-flash-lite-latest',
          'gemini-2.0-flash-lite',
          'gemini-2.0-flash-lite-001',
          'gemini-pro-latest',
        ]
      : [
          'gemini-3-pro-preview',
          'gemini-2.5-pro',
          'gemini-pro-latest',
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-flash-latest',
        ]

  for (const c of candidates) {
    if (normalized.has(c)) return c
  }
  return available[0] || null
}

function isModelNotFoundError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase()
  return (msg.includes('404') && msg.includes('not found')) || msg.includes('not supported for generatecontent')
}

async function generateContentWithFallback(options: {
  systemPrompt: string
  prefer: 'pro' | 'flash'
  generationConfig: Record<string, unknown>
  prompt: string
}) {
  const genAI = getGeminiClient()
  const apiKey = process.env.GEMINI_API_KEY as string
  const requested = getGeminiTextModel()

  const makeModel = (name: string) =>
    genAI.getGenerativeModel({
      model: name,
      generationConfig: options.generationConfig as any,
      systemInstruction: options.systemPrompt as any,
    })

  const tryGenerate = async (name: string) => {
    const model = makeModel(name)
    return { result: await model.generateContent(options.prompt), modelName: name }
  }

  try {
    return await tryGenerate(requested)
  } catch (err) {
    if (!isModelNotFoundError(err)) throw err
  }

  const available = await listAvailableTextModels(apiKey)
  const fallback = pickFallbackModel(available, options.prefer)
  if (!fallback) {
    throw new Error(
      `No Gemini text models available for generateContent for this API key. ` +
        `Set GEMINI_TEXT_MODEL to one of the models returned by ListModels.`
    )
  }

  console.warn(`[gemini] GEMINI_TEXT_MODEL "${requested}" not available; falling back to "${fallback}"`)
  return await tryGenerate(fallback)
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

function safeParseJsonObject(text: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function normalizePdfContent(input: string, maxChars: number = 12000): string {
  return (input || '').replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

function extractPlainText(text: string): string {
  const cleaned = (text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  if (!cleaned) return ''
  if ((cleaned.startsWith('{') && cleaned.endsWith('}')) || cleaned.startsWith('[')) return ''
  return cleaned
}

function deriveTitleFromContent(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match?.[1]) return match[1].trim().slice(0, 90)
  const firstSentence = content.replace(/\s+/g, ' ').trim().split(/[.!?]/)[0]
  return (firstSentence || 'Artykul okulistyczny').trim().slice(0, 90)
}

function buildExcerpt(content: string): string {
  const plain = content.replace(/[#*_>`\-\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim()
  return plain.slice(0, 160)
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

  const normalizedPdfContent = normalizePdfContent(pdfContent)

  const userPrompt = `Based on the following medical document content, create a blog article/review in Polish.
Target word count: ~400 words for the main content (aim for 380-450).
IMPORTANT: word count refers ONLY to the "content" field (the markdown article body), excluding title, excerpt, SEO meta, tags/categories, and excluding URLs/placeholders.

Document content: ${normalizedPdfContent}

IMPORTANT:
- Return a SINGLE valid JSON object (no markdown, no code fences, no extra text).
- Include up to 3 figures (mix of medical illustration and/or chart/graph if the PDF contains numerical data).
- In "content" markdown, include each figure placeholder exactly once as an image URL token (not the full markdown), e.g. ${getFigurePlaceholderUrl(1)}.
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

  const prefer: 'pro' | 'flash' =
    (process.env.GEMINI_TEXT_MODEL || '').toLowerCase().includes('flash') ? 'flash' : 'pro'

  const { result } = await generateContentWithFallback({
    systemPrompt,
    prefer,
    prompt: userPrompt,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  })

  const responseText = result.response.text()
  const jsonStr = extractJsonObject(responseText)
  const articleData = safeParseJsonObject(jsonStr) || {}

  let generatedImageUrl: string | undefined
  let content: string = typeof articleData.content === 'string' ? articleData.content : ''
  let title: string = typeof articleData.title === 'string' ? articleData.title : 'Untitled Article'
  let excerpt: string = typeof articleData.excerpt === 'string' ? articleData.excerpt : ''

  const figures: Array<{
    id?: string
    alt?: string
    caption?: string
    placeholder?: string
    prompt?: string
  }> = Array.isArray(articleData.figures) ? articleData.figures : []

  const canUseGeminiImages = Boolean(process.env.GEMINI_API_KEY)
  let coverFallbackUrl: string | null = null

  if (!content || content.trim().length < 120) {
    const fallbackFromText = extractPlainText(responseText)
    if (fallbackFromText && fallbackFromText.length >= 120) {
      content = fallbackFromText
    }
  }

  if (!content || content.trim().length < 120) {
    const rescuePrompt = `Create a clean Polish blog article based on the document excerpt below.
Return ONLY a valid JSON object matching the required format. Do not include markdown fences or extra text.
Rules:
- Do not copy long passages verbatim. Paraphrase in simple, patient-friendly Polish.
- Include clear headings and short paragraphs.
- Do not include figure placeholders.

Document excerpt:
${normalizedPdfContent}

Required JSON format:
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

    try {
      const rescue = await generateContentWithFallback({
        systemPrompt,
        prefer,
        prompt: rescuePrompt,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      })

      const rescueText = rescue.result.response.text()
      const rescueJson = safeParseJsonObject(extractJsonObject(rescueText))
      if (rescueJson) {
        content = rescueJson.content || content
        title = rescueJson.title || title
        excerpt = rescueJson.excerpt || excerpt
        articleData.seoMeta = rescueJson.seoMeta || articleData.seoMeta
        articleData.suggestedTags = rescueJson.suggestedTags || articleData.suggestedTags
        articleData.suggestedCategory = rescueJson.suggestedCategory || articleData.suggestedCategory
      } else {
        const rescuePlain = extractPlainText(rescueText)
        if (rescuePlain) content = rescuePlain
      }
    } catch (error) {
      console.warn('Gemini rescue generation failed:', error)
    }
  }

  if (!content || content.trim().length < 80) {
    content = `# ${title}\n\nNie udalo sie wygenerowac pelnej tresci. Sprobuj ponownie z innym dokumentem.`
  }

  if (!title || title === 'Untitled Article') {
    title = deriveTitleFromContent(content)
  }

  if (!excerpt || excerpt.trim().length < 40) {
    excerpt = buildExcerpt(content)
  }

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
  }

  // Cover fallback via internet search if Imagen fails or is disabled.
  if (!generatedImageUrl) {
    try {
      coverFallbackUrl = await findCoverImageUrl({
        title,
        category: articleData.suggestedCategory,
        tags: Array.isArray(articleData.suggestedTags) ? articleData.suggestedTags : [],
        targetAudience,
      })
      if (coverFallbackUrl) generatedImageUrl = coverFallbackUrl
    } catch (error) {
      console.warn('Cover search fallback failed:', error)
    }
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
      // Replace placeholder with cover fallback if available.
      const placeholder = figure.placeholder || getFigurePlaceholderUrl(i + 1)
      if (coverFallbackUrl && content.includes(placeholder)) {
        content = content.split(placeholder).join(coverFallbackUrl)
      }
    }
  }

  // Avoid forcing length with raw PDF text. If slightly short, keep as-is.

  return {
    title,
    content,
    excerpt,
    seoMeta: articleData.seoMeta || {
      title,
      description: excerpt || '',
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

  const prefer: 'pro' | 'flash' =
    (process.env.GEMINI_TEXT_MODEL || '').toLowerCase().includes('flash') ? 'flash' : 'pro'

  const { result } = await generateContentWithFallback({
    systemPrompt,
    prefer,
    prompt:
      `Improve and enhance the following Polish article content while maintaining the same message and information. ` +
      `Make it more engaging and well-structured. Return only the improved markdown content:\n\n${content}`,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  })

  return result.response.text() || content
}
