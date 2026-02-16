import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIGenerationResponse, TargetAudience } from '@/types'
import { generateAndUploadImagen, type ImagenPurpose } from '@/lib/ai/gemini-imagen'
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

const PATIENT_CATEGORIES = [
  'Zdrowie oczu',
  'Choroby',
  'Leczenie',
  'Profilaktyka',
  'Soczewki',
  'Diagnostyka',
  'Chirurgia',
]

const PROFESSIONAL_CATEGORIES = [
  'Kliniczna',
  'Badania',
  'Techniki operacyjne',
  'Farmakologia',
  'Przypadki',
  'Diagnostyka',
  'Wytyczne',
]

const PATIENT_SYSTEM_PROMPT = `You are a medical content writer specializing in ophthalmology content for patients.
Write in simple, accessible Polish language. Avoid medical jargon or explain it when necessary.
Focus on being educational, reassuring, and practical.
Format the content with clear headings, bullet points where appropriate, and easy-to-understand explanations.
Every article MUST be complete — never stop mid-sentence or mid-paragraph.
You MUST fill in ALL JSON fields completely. Empty arrays or generic placeholder values are NOT acceptable.`

const PROFESSIONAL_SYSTEM_PROMPT = `You are the Editor-in-Chief of a high-impact scientific journal specializing in ophthalmology.
Your task is to extract the **pure essence** of the provided article for a rapid-fire briefing designated for busy ophthalmologists and optometrists.

**Strict Constraints:**
1.  **Zero Fluff:** Eliminate all introductory phrases, transitional sentences, and meta-commentary (e.g., avoid "The authors conclude that...", "It is important to note..."). Go straight to the facts.
2.  **Maximum Density:** Use an economy of words. Prioritize data, p-values, specific anatomical structures, and exact drug dosages over descriptive prose.
3.  **Length:** Do not expand the content. If the source is short, the output must be short. Quality is measured by information density, not word count.
4.  **Language:** Write in **ultra-precise, academic Polish**. Use professional terminology exclusively.

**Structure:**

**1. Core Thesis (Synteza):**
Provide exactly 1-2 complex sentences summarizing the primary discovery or argument. No generalizations.

**2. Data & Findings (Kluczowe Dane):**
Use a bulleted list to present the hard evidence.
* Focus strictly on statistical outcomes, specific clinical protocols, or concrete physiological changes.
* Ignore general background information unless critical for context.

**3. Practice Directive (Implikacje Kliniczne):**
In 1-2 sentences, state the direct actionable application for clinical practice (e.g., "Change first-line therapy to X", "Monitor Y parameter"). If there is no direct application, state "Research relevance only."

Ground all claims strictly in the provided document. Do not hallucinate data.`

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

  const validCategories = targetAudience === 'patient' ? PATIENT_CATEGORIES : PROFESSIONAL_CATEGORIES

  const audienceInstructions =
    targetAudience === 'professional'
      ? `AudienceInstructions (professional):
- In "content" use EXACT section headings in this order:
  ## Streszczenie redakcyjne
  ## Kluczowe informacje
  ## Znaczenie kliniczne
- Extract only details present in the document (numbers, protocols, outcomes); do not invent details or citations.
- For "suggestedCategory", pick the BEST match from: ${validCategories.join(', ')}.
`
      : `AudienceInstructions (patient):
- Keep language simple and reassuring.
- Explain any unavoidable medical terms briefly.
- Use ## headings to break the article into 3-5 clear sections.
- For "suggestedCategory", pick the BEST match from: ${validCategories.join(', ')}.
`

  const normalizedPdfContent = normalizePdfContent(pdfContent)

  const userPrompt = `Based on the following medical document content, create a blog article/review in Polish.
Target word count: ~400 words for the main content (aim for 380-450).
IMPORTANT: word count refers ONLY to the "content" field (the markdown article body), excluding title, excerpt, SEO meta, tags/categories, and excluding URLs/placeholders.

Document content: ${normalizedPdfContent}

CRITICAL RULES — you MUST follow ALL of these:
1. Return a SINGLE valid JSON object (no markdown, no code fences, no extra text).
2. The "content" field MUST be a COMPLETE article — never stop mid-sentence or mid-paragraph.
3. Include 1-3 figures (medical illustrations or charts if the PDF has numerical data). In "content", place each figure placeholder exactly once, e.g. ${getFigurePlaceholderUrl(1)}.
4. "seoMeta.title" MUST be max 60 characters — write a SHORT, keyword-rich title, NOT the full article title.
5. "seoMeta.description" MUST be max 160 characters — write a unique meta description that summarizes the article differently from the excerpt.
6. "seoMeta.keywords" MUST contain 3-5 relevant Polish keywords (e.g. ["zaćma", "soczewka wewnątrzgałkowa", "operacja oka"]). NEVER return an empty array.
7. "suggestedTags" MUST contain 2-4 specific Polish tags relevant to the article topic. NEVER return an empty array.
8. "suggestedCategory" MUST be one of: ${validCategories.join(', ')}. NEVER use "General".
9. "excerpt" must be exactly 2-3 sentences, max 160 characters, in Polish — a genuine summary, NOT a copy of the first paragraph.
10. "coverImagePrompt" must be a detailed English prompt for an AI image generator (no text in image).
${audienceInstructions}

Required JSON format:
{
  "title": "Descriptive article title in Polish",
  "content": "Full COMPLETE article in markdown (380-450 words, with ## headings, bullet points, and figure placeholders like ${getFigurePlaceholderUrl(1)})",
  "excerpt": "2-3 sentence summary, max 160 characters",
  "seoMeta": {
    "title": "Short SEO title, max 60 chars",
    "description": "Unique meta description, max 160 chars",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "One of: ${validCategories.join(' | ')}",
  "coverImagePrompt": "Detailed English prompt for cover image, no text in image",
  "figures": [
    {
      "id": "figure_1",
      "type": "illustration or chart",
      "alt": "Alt text in Polish",
      "caption": "Short caption in Polish",
      "placeholder": "${getFigurePlaceholderUrl(1)}",
      "prompt": "Detailed English image generation prompt. If chart, include exact data and style."
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
      temperature: 0.5,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  })

  const responseText = result.response.text()
  console.log('[gemini] Raw response length:', responseText.length)
  console.log('[gemini] Raw response (first 500 chars):', responseText.slice(0, 500))
  const jsonStr = extractJsonObject(responseText)
  console.log('[gemini] Extracted JSON length:', jsonStr.length)
  const articleData = safeParseJsonObject(jsonStr) || {}
  console.log('[gemini] Parsed keys:', Object.keys(articleData))
  console.log('[gemini] Content length:', (articleData.content || '').length)
  console.log('[gemini] Title:', articleData.title)

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

  // ── Post-processing: validate and fix output quality ──

  // Fix SEO meta
  const seoMeta = articleData.seoMeta || {}
  let seoTitle: string = typeof seoMeta.title === 'string' ? seoMeta.title : ''
  let seoDescription: string = typeof seoMeta.description === 'string' ? seoMeta.description : ''
  let seoKeywords: string[] = Array.isArray(seoMeta.keywords) ? seoMeta.keywords.filter(Boolean) : []

  // Enforce SEO title max 60 chars — truncate at last word boundary if needed
  if (!seoTitle || seoTitle.length < 10) {
    seoTitle = title.slice(0, 60)
  }
  if (seoTitle.length > 60) {
    seoTitle = seoTitle.slice(0, 57).replace(/\s+\S*$/, '') + '...'
  }

  // Enforce SEO description max 160 chars
  if (!seoDescription || seoDescription.length < 20 || seoDescription === excerpt) {
    // Generate a unique description from mid-content
    const plainContent = content.replace(/[#*_>`\-\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim()
    const sentences = plainContent.split(/[.!?]/).filter((s) => s.trim().length > 20)
    seoDescription = sentences.length > 1
      ? (sentences[1].trim() + '.').slice(0, 160)
      : plainContent.slice(50, 210).replace(/\s+\S*$/, '') + '...'
  }
  if (seoDescription.length > 160) {
    seoDescription = seoDescription.slice(0, 157).replace(/\s+\S*$/, '') + '...'
  }

  // Enforce keywords — extract from content if empty
  if (seoKeywords.length === 0) {
    const ophthalmologyTerms = [
      'zaćma', 'jaskra', 'glaukoma', 'rogówka', 'soczewka', 'siatkówka', 'AMD',
      'krótkowzroczność', 'astygmatyzm', 'suche oko', 'okulistyka', 'operacja',
      'wzrok', 'oko', 'oczy', 'widzenie', 'badanie', 'leczenie', 'diagnostyka',
      'chirurgia', 'laserowa', 'ciśnienie', 'wewnątrzgałkowe', 'refrakcja'
    ]
    const contentLower = content.toLowerCase()
    seoKeywords = ophthalmologyTerms.filter((term) => contentLower.includes(term.toLowerCase())).slice(0, 5)
    if (seoKeywords.length < 2) {
      seoKeywords = ['okulistyka', 'zdrowie oczu', title.split(' ').slice(0, 2).join(' ')]
    }
  }

  // Enforce suggestedTags
  let suggestedTags: string[] = Array.isArray(articleData.suggestedTags)
    ? articleData.suggestedTags.filter(Boolean)
    : []
  if (suggestedTags.length === 0) {
    suggestedTags = seoKeywords.slice(0, 3)
  }

  // Enforce suggestedCategory — map to valid category or find best match
  const allowedCategories = targetAudience === 'patient' ? PATIENT_CATEGORIES : PROFESSIONAL_CATEGORIES
  let suggestedCategory: string = articleData.suggestedCategory || ''
  if (!suggestedCategory || suggestedCategory === 'General' || !allowedCategories.includes(suggestedCategory)) {
    // Try to find the best matching category from content
    const contentLower = content.toLowerCase() + ' ' + title.toLowerCase()
    const categoryScores = allowedCategories.map((cat) => ({
      cat,
      score: contentLower.split(cat.toLowerCase()).length - 1,
    }))
    categoryScores.sort((a, b) => b.score - a.score)
    suggestedCategory = categoryScores[0].score > 0 ? categoryScores[0].cat : allowedCategories[0]
  }

  // ── Image generation ──

  if (generateImage && canUseGeminiImages) {
    try {
      const coverPrompt: string =
        articleData.coverImagePrompt ||
        `Professional medical illustration related to ophthalmology for an article titled "${title}". Clean, modern medical aesthetic. No text in the image.`

      generatedImageUrl = await generateAndUploadImagen(
        coverPrompt,
        'cover',
        'ai-cover',
        'cover'
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
        category: suggestedCategory,
        tags: suggestedTags,
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

    // Pick the right Imagen model based on figure type
    const figurePurpose: ImagenPurpose =
      (figure as any).type === 'chart' ? 'chart' : 'illustration'

    try {
      const url = await generateAndUploadImagen(
        figure.prompt,
        figure.id || `figure-${i + 1}`,
        'ai-figure',
        figurePurpose
      )

      const placeholder = figure.placeholder || getFigurePlaceholderUrl(i + 1)
      const alt = figure.alt || figure.caption || `Rycina ${i + 1}`
      const captionLine = figure.caption ? `\n\n*${figure.caption}*` : ''
      const markdownImage = `![${alt}](${url})${captionLine}`

      if (content.includes(placeholder)) {
        content = content.split(placeholder).join(markdownImage)
      }
    } catch (error) {
      console.error('Gemini figure generation failed:', error)
      const placeholder = figure.placeholder || getFigurePlaceholderUrl(i + 1)
      if (coverFallbackUrl && content.includes(placeholder)) {
        const alt = figure.alt || figure.caption || `Rycina ${i + 1}`
        content = content.split(placeholder).join(`![${alt}](${coverFallbackUrl})`)
      }
    }
  }

  // Safety net: remove any leftover figure placeholders so users don't see them.
  content = content
    .replace(/\{\{FIGURE_\d+_URL\}\}/g, '')
    .replace(/https?:\/\/www\.google\.com\/search\?q=%7B%7BFIGURE_\d+_URL%7D%7D/g, '')
    .replace(/\n{3,}/g, '\n\n')

  return {
    title,
    content,
    excerpt,
    seoMeta: {
      title: seoTitle,
      description: seoDescription,
      keywords: seoKeywords,
    },
    suggestedTags,
    suggestedCategory,
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
