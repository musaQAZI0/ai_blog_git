import OpenAI from 'openai'
import { AIGenerationResponse, TargetAudience } from '@/types'
import { generateAndUploadImagen, type ImagenPurpose } from '@/lib/ai/gemini-imagen'
import { findCoverImageUrl } from '@/lib/images/cover-search'

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({ apiKey })
}

function getOpenAITextModel() {
  return process.env.OPENAI_TEXT_MODEL || 'gpt-4-turbo'
}

function getFigurePlaceholderUrl(index: number) {
  return `https://www.google.com/search?q=%7B%7BFIGURE_${index}_URL%7D%7D`
}

const PATIENT_SYSTEM_PROMPT = `You are a medical content writer specializing in ophthalmology content for patients.
Write in simple, accessible Polish language. Avoid medical jargon or explain it when necessary.
Focus on being educational, reassuring, and practical.
Format the content with clear headings, bullet points where appropriate, and easy-to-understand explanations.
Every article MUST be complete — never stop mid-sentence or mid-paragraph.
You MUST fill in ALL JSON fields completely. Empty arrays or generic placeholder values are NOT acceptable.`

const PROFESSIONAL_SYSTEM_PROMPT = `You are the Editor-in-Chief of a high-impact scientific journal specializing in ophthalmology.
Your task is to write a concise editorial review of the provided article, targeted specifically at ophthalmologists and optometrists.
Write in sophisticated, academic Polish appropriate for peer-reviewed literature.
Adopt an authoritative, analytical, and objective tone.
Structure the review to include:

Editorial Summary: A high-level synthesis of the article's subject.

Key Highlights: Extract the most important data points, specific study findings, statistical outcomes, or distinct clinical protocols found in the text.

Clinical Impact: Explicitly explain why this matters for daily practice (e.g., diagnostics, treatment efficacy, patient management).

Ground all claims strictly in the provided document content. If the document does not contain a detail, do not invent it.`

export async function generateArticleWithOpenAI(
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
- In "content" use EXACT section headings in this order:
  ## Streszczenie redakcyjne
  ## Kluczowe informacje
  ## Znaczenie kliniczne
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

  const openai = getOpenAIClient()
  const model = getOpenAITextModel()

  const completion = await openai.chat.completions.create({
    model,
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
  let content: string = articleData.content || ''

  function countWords(text: string): number {
    return text
      .replace(/`[^`]*`/g, ' ')
      .replace(/\{\{FIGURE_\d+_URL\}\}/g, ' ')
      .replace(/\]\([^)]+\)/g, ' ') // strip markdown links/urls from count
      .replace(/https?:\/\/\S+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
  }

  async function ensureTargetLength(markdown: string): Promise<string> {
    const words = countWords(markdown)
    if (words >= 380) return markdown

    const openai = getOpenAIClient()
    const systemPrompt = targetAudience === 'patient'
      ? PATIENT_SYSTEM_PROMPT
      : PROFESSIONAL_SYSTEM_PROMPT

    const completion = await openai.chat.completions.create({
      model: getOpenAITextModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `Expand the following Polish blog article to ~400 words (aim 380-450) while preserving meaning and medical accuracy.\n` +
            `Rules:\n` +
            `- Return ONLY the improved markdown content.\n` +
            `- Do NOT add SEO metadata.\n` +
            `- Keep any figure placeholder URLs like ${getFigurePlaceholderUrl(1)} exactly as-is.\n` +
            `- If the content contains ![...](...) images, keep them unchanged.\n\n` +
            markdown,
        },
      ],
      temperature: 0.6,
      max_tokens: 2500,
    })

    return completion.choices[0]?.message?.content || markdown
  }

  async function ensureProfessionalSpecificity(markdown: string): Promise<string> {
    if (targetAudience !== 'professional') return markdown

    const openai = getOpenAIClient()

    const completion = await openai.chat.completions.create({
      model: getOpenAITextModel(),
      messages: [
        { role: 'system', content: PROFESSIONAL_SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `Rewrite the following Polish professional/clinical blog article to be LESS generic and more grounded in the provided document.\n` +
            `Constraints:\n` +
            `- Keep total length ~400 words (aim 380-450).\n` +
            `- Do NOT add SEO metadata.\n` +
            `- Do NOT fabricate studies/citations.\n` +
            `- Preserve any figure placeholder URLs (e.g. ${getFigurePlaceholderUrl(1)}) exactly as-is.\n` +
            `- Prefer the editorial structure: Streszczenie redakcyjne, Kluczowe informacje, Znaczenie kliniczne.\n\n` +
            `Document (for grounding):\n${pdfContent}\n\n` +
            `Article to rewrite:\n${markdown}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 2500,
    })

    return completion.choices[0]?.message?.content || markdown
  }

  content = await ensureTargetLength(content)
  content = await ensureProfessionalSpecificity(content)

  function injectFigure(options: {
    content: string
    placeholder: string
    url: string
    alt: string
    caption?: string
  }): string {
    const { placeholder, url, caption } = options
    const captionSuffix = caption ? `\n\n*${caption}*` : ''

    if (options.content.includes(placeholder)) {
      return options.content.split(placeholder).join(url)
    }

    // No placeholder present: append a plain URL token (no markdown image).
    return options.content + `\n\n${url}${captionSuffix}\n`
  }

  const figures: Array<{
    id?: string
    type?: 'illustration' | 'chart' | string
    alt?: string
    caption?: string
    placeholder?: string
    prompt?: string
  }> = Array.isArray(articleData.figures) ? articleData.figures : []

  const canUseGemini = Boolean(process.env.GEMINI_API_KEY)

  if (canUseGemini) {
    try {
      const coverPrompt: string =
        articleData.coverImagePrompt ||
        `Professional medical illustration related to ophthalmology for an article titled "${articleData.title}". Clean, modern medical aesthetic. No text in the image.`

      generatedImageUrl = await generateAndUploadImagen(
        coverPrompt,
        'cover',
        'ai-cover',
        'cover'
      )
    } catch (error) {
      console.error('Gemini cover image generation failed:', error)
    }

    const limitedFigures = figures.slice(0, 3)

    for (let i = 0; i < limitedFigures.length; i++) {
      const figure = limitedFigures[i]
      if (!figure?.prompt) continue

      // Pick the right Imagen model based on figure type
      const figurePurpose: ImagenPurpose =
        figure.type === 'chart' ? 'chart' : 'illustration'

      try {
        const url = await generateAndUploadImagen(
          figure.prompt,
          figure.id || `figure-${i + 1}`,
          'ai-figure',
          figurePurpose
        )

        const placeholder =
          figure.placeholder ||
          getFigurePlaceholderUrl(i + 1)
        const alt = figure.alt || `Ilustracja ${i + 1}`
        content = injectFigure({
          content,
          placeholder,
          url,
          alt,
          caption: figure.caption,
        })
      } catch (error) {
        console.error('Gemini figure generation failed:', error)
      }
    }

    // If any placeholders remain (image generation failed), remove them so users don't see raw tokens.
    content = content
      .replace(/\{\{FIGURE_\d+_URL\}\}/g, '')
      .replace(/https?:\/\/www\.google\.com\/search\?q=%7B%7BFIGURE_\d+_URL%7D%7D/g, '')
      .replace(/\n{3,}/g, '\n\n')
  } else if (generateImage) {
    // Fallback to DALL·E if Gemini is not configured
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

  // Final fallback: always provide a cover image URL so cards show a thumbnail even if generation/upload fails.
  if (!generatedImageUrl) {
    generatedImageUrl = await findCoverImageUrl({
      title: articleData.title || 'medical',
      category: articleData.suggestedCategory,
      tags: Array.isArray(articleData.suggestedTags) ? articleData.suggestedTags : [],
      targetAudience,
    })
      .then((url) => url || undefined)
      .catch(() => undefined)
  }

  // Safety net: never show raw placeholders.
  content = content
    .replace(/\{\{FIGURE_\d+_URL\}\}/g, '')
    .replace(/https?:\/\/www\.google\.com\/search\?q=%7B%7BFIGURE_\d+_URL%7D%7D/g, '')
    .replace(/\n{3,}/g, '\n\n')

  return {
    title: articleData.title,
    content,
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
    model: getOpenAITextModel(),
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
