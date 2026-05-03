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
Your task is to create a detailed professional review for ophthalmologists and optometrists.

CRITICAL: You must return a complete JSON object with fields: title, content, excerpt, seoMeta, suggestedTags, suggestedCategory, coverImagePrompt, figures.

**Writing Style for the "content" field:**
1.  **Zero Fluff:** Eliminate all introductory phrases, transitional sentences, and meta-commentary (e.g., avoid "The authors conclude that...", "It is important to note..."). Go straight to the facts.
2.  **Maximum Density:** Use an economy of words. Prioritize data, p-values, specific anatomical structures, and exact drug dosages over descriptive prose.
3.  **Length:** Aim for about 500 words when the source document contains enough substance. Keep the writing dense and evidence-based; prioritize the main methodology, endpoints, key results, limitations, and clinical implications without adding filler.
4.  **Language:** Write in **ultra-precise, academic Polish**. Use professional terminology exclusively.

**Content Structure (these are markdown headings INSIDE the "content" field, NOT JSON keys):**

Under ## Streszczenie redakcyjne:
Provide 2-3 concise paragraphs summarizing the primary discovery, study context, and most important numerical outcomes. No generalizations.

Under ## Metodyka i populacja:
Describe the study design, population, inclusion/exclusion context, interventions, measurements, and endpoints that are explicitly present in the document.

Under ## Kluczowe wyniki:
Use paragraphs and a short bulleted list to present the hard evidence.
* Focus strictly on statistical outcomes, specific clinical protocols, or concrete physiological changes.
* Ignore general background information unless critical for context.

Under ## Interpretacja kliniczna:
Explain how the findings should be interpreted in professional ophthalmology practice, including where the evidence is strong and where it is only hypothesis-generating.

Under ## Ograniczenia:
State the methodological limitations, missing data, generalizability issues, or uncertainties explicitly supported by the document.

Ground all claims strictly in the provided document. Do not hallucinate data.

TERMINOLOGY ACCURACY - MANDATORY:
5. Translate "non-toric IOL" as "nietoryczna soczewka wewnątrzgałkowa" / "soczewka nietoryczna". Never translate it as "niefokalna".
5a. Do not change lens class terms. "Monofocal" means "jednoogniskowa"; "non-toric" means "nietoryczna".

NUMERIC ACCURACY - MANDATORY:
6. Before writing any numeric value (SD, RMSAE, p-value, percentage, mean, n), trace it to a specific table or figure in the document. If you cannot confirm a number exists verbatim in a table or figure, omit it entirely rather than approximate. Never report a value for one formula that belongs to another formula in the same table.

NON-SIGNIFICANT COMPARISONS - MANDATORY:
7. For every statistically significant finding you report, explicitly state which comparisons did NOT reach significance (p>=0.05). Both significant and non-significant results are clinically actionable. Example format: "Formula X wykazala istotnie nizsze SD niz A, B i C (p<0,05), nie roznic sie istotnie od D, E i F."

SUBGROUP REPORTING - MANDATORY:
8. For each subgroup (oczy dlugie, oczy krotkie, typ IOL), report BOTH the primary endpoint winner AND any notable secondary endpoint findings (interval analysis, median AE) even when a different formula leads the secondary result. Do not report only one formula per subgroup.

ENDPOINT LABELING - MANDATORY:
9. Always label whether a finding comes from a primary endpoint (SD, RMSAE) or a secondary endpoint (odsetek w przedzialach, mediana AE). Use explicit labels such as "(pierwszorzedowy punkt koncowy)" or "(drugorzedowy punkt koncowy)" on first mention within each section.

ZEROED-MEAN ANALYSIS:
10. If the paper reports an analysis after adjusting mean PE to zero (per Hoffer et al. protocol), include this as a separate sub-paragraph within "Kluczowe wyniki" under the heading "Analiza po wyzerowaniu sredniego bledu predykcji". This is a primary analytical result, not a limitation.`

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

function countWords(text: string): number {
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#*_>`\-[\](){}]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function deriveTitleFromContent(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match?.[1]) return match[1].trim().slice(0, 90)
  const firstSentence = content.replace(/\s+/g, ' ').trim().split(/[.!?]/)[0]
  return (firstSentence || 'Artykuł okulistyczny').trim().slice(0, 90)
}

function buildExcerpt(content: string): string {
  const plain = content.replace(/[#*_>`\-\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim()
  return plain.slice(0, 160)
}

function sanitizeChartCaption(caption: string): string {
  const cleaned = (caption || '')
    .replace(/\b(?:Table|Tabela)\s*\d+\b\s*[-:–—.]?\s*/gi, '')
    .replace(/\b(?:z|from)\s+(?:Table|Tabela)\s*\d+\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return 'Wizualizacja danych liczbowych z analizowanego dokumentu.'
  return cleaned
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

  // Extract chart data first with OpenAI for professional articles so Gemini can reference available charts.
  let extractedChartData: any[] = []
  let chartContext = ''
  console.log(`[gemini] Chart pre-extraction check: generateImage=${generateImage}, targetAudience=${targetAudience}`)
  if (generateImage && targetAudience === 'professional') {
    try {
      console.log('[gemini] Pre-extracting chart data with OpenAI to inform article generation...')
      console.log(`[gemini] PDF content length for OpenAI chart extraction: ${pdfContent.length} chars`)
      const { extractChartDataFromPDF } = await import('@/lib/charts/data-extractor')
      extractedChartData = await extractChartDataFromPDF(pdfContent, 2)
      console.log(`[gemini] Chart extraction returned ${extractedChartData.length} verified chart(s)`)

      if (extractedChartData.length > 0) {
        console.log(`[gemini] Found ${extractedChartData.length} charts to include in article`)
        chartContext = `\n\nAVAILABLE CHARTS TO REFERENCE IN YOUR ARTICLE:
${extractedChartData.map((chart, i) => `
Chart ${i + 1}: ${chart.chartTitle}
Dataset ID: ${chart.id || `chart_${i + 1}`}
Type: ${chart.chartType}
X labels: ${JSON.stringify(chart.data.labels)}
Datasets: ${JSON.stringify(chart.data.datasets)}
Source: ${chart.sourceDescription}
Placeholder: ${getFigurePlaceholderUrl(i + 1)}
Chart token: {{CHART:${chart.id || `chart_${i + 1}`}:${chart.chartType}}}
`).join('\n')}

CRITICAL: Write your article content to reference these specific charts only. Place Chart 1 before Chart 2 in the article. Place each chart placeholder (e.g., ${getFigurePlaceholderUrl(1)}) or matching chart token (e.g., {{CHART:dataset_name:chart_type}}) in your content where you discuss the corresponding data. Write text that introduces and explains what the chart shows.
CHART ACCURACY RULES:
- Do not invent chart values, categories, trends, statistical significance, or table numbers.
- If a chart has multiple datasets, attribute numeric claims to the exact dataset/formula/category shown in the chart data. Do not call one dataset "overall" or "best" unless the source text explicitly says that.
- For SD/error charts, state that a lower value means greater precision only when that is consistent with the source description.
- Preserve endpoint hierarchy from the source. Do not call a result "secondary" if the methods/source context says it is a primary endpoint.
- Never mention "Table 2", "Table 3", or any table number in chart captions/descriptions.`
      }
    } catch (error) {
      console.warn('[gemini] Chart pre-extraction failed, continuing without chart context:', error)
    }
  }

  const figureInstructions =
    targetAudience === 'professional'
      ? `3. Include MAXIMUM 2 figures that show the MOST IMPORTANT results. PRIORITIZE data charts/graphs (bar charts, line graphs, scatter plots, etc.) that visualize PRIMARY ENDPOINTS and KEY FINDINGS from the PDF source document.
3a. CRITICAL for charts/graphs: Include data labels and text ONLY if they come from the source document. Use EXACT values from the PDF - do NOT make up or estimate numbers.
3b. Keep labels concise and to the point. Request simple, clear text (e.g., "Baseline: 20.5 mmHg, Month 6: 15.2 mmHg", "Cooke K6", "Barrett Universal II").
3c. Focus on DATA VISUALIZATION (charts showing statistics, results, comparisons) rather than anatomical illustrations.
3d. Only include charts that are clinically relevant and directly support the main conclusions.
3e. In "content", place each figure placeholder exactly once, e.g. ${getFigurePlaceholderUrl(1)}.`
      : `3. Include 1-3 figures (simple anatomical illustrations ONLY). In "content", place each figure placeholder exactly once, e.g. ${getFigurePlaceholderUrl(1)}.
3a. CRITICAL: ALL figures MUST be completely clean - NO TEXT, NO LABELS, NO WORDS, NO NUMBERS, NO DATA.
3b. Request only pure visual illustrations without any text elements.
3c. NO charts or data visualizations.`

  const audienceInstructions =
    targetAudience === 'professional'
      ? `AudienceInstructions (professional):
- In "content" use EXACT section headings in this order:
  ## Streszczenie redakcyjne
  ## Metodyka i populacja
  ## Kluczowe wyniki
  ## Interpretacja kliniczna
  ## Ograniczenia
- Extract only details present in the document (numbers, protocols, outcomes); do not invent details or citations.
- Write a concise professional review. Use about 500 words for the "content" field when the document contains enough information.
- For each subgroup analyzed (oczy dlugie, oczy krotkie, typ IOL), report BOTH the primary endpoint result and any secondary endpoint finding, even if led by different formulas.
- When reporting the primary SD comparison for the whole dataset, name formulas with no statistically significant difference from the best formula.
- If the paper reports mean PE adjusted to zero (Hoffer et al. protocol), add "### Analiza po wyzerowaniu sredniego bledu predykcji" inside "## Kluczowe wyniki" and report exact values.
- For charts, use the provided chart placeholder URL or a token in the format {{CHART:dataset_name:chart_type}}.
- For "suggestedCategory", pick the BEST match from: ${validCategories.join(', ')}.
`
      : `AudienceInstructions (patient):
- Keep language simple and reassuring.
- Explain any unavoidable medical terms briefly.
- Use ## headings to break the article into 3-5 clear sections.
- For "suggestedCategory", pick the BEST match from: ${validCategories.join(', ')}.
`

  const normalizedPdfContent = normalizePdfContent(pdfContent)
  const targetWordCount = targetAudience === 'professional'
    ? '~500 words for the main content'
    : '~400 words for the main content (aim for 380-450)'
  const contentWordCountDescription = targetAudience === 'professional'
    ? 'about 500 words'
    : '380-450 words'

  const userPrompt = `Based on the following medical document content, create a blog article/review in Polish.
Target word count: ${targetWordCount}.
IMPORTANT: word count refers ONLY to the "content" field (the markdown article body), excluding title, excerpt, SEO meta, tags/categories, and excluding URLs/placeholders.

Document content: ${normalizedPdfContent}${chartContext}

CRITICAL RULES — you MUST follow ALL of these:
1. Return a SINGLE valid JSON object (no markdown, no code fences, no extra text).
2. The "content" field MUST be a COMPLETE article — never stop mid-sentence or mid-paragraph.
${figureInstructions}
4. "seoMeta.title" MUST be max 60 characters — write a SHORT, keyword-rich title, NOT the full article title.
5. "seoMeta.description" MUST be max 160 characters — write a unique meta description that summarizes the article differently from the excerpt.
6. "seoMeta.keywords" MUST contain 3-5 relevant Polish keywords (e.g. ["zaćma", "soczewka wewnątrzgałkowa", "operacja oka"]). NEVER return an empty array.
7. "suggestedTags" MUST contain 2-4 specific Polish tags relevant to the article topic. NEVER return an empty array.
8. "suggestedCategory" MUST be one of: ${validCategories.join(', ')}. NEVER use "General".
9. "excerpt" must be exactly 2-3 sentences, max 160 characters, in Polish — a genuine summary, NOT a copy of the first paragraph.
10. "coverImagePrompt" must be a detailed English prompt for an AI image generator (no text in image).
11. MUST include a "## Źródło" section at the END of the content with the original article reference extracted from the PDF.
12. Reference format: Authors (one line), Title (one line), Journal Year Vol. X Issue Y Pages Z-W (one line).
13. Example reference format:
    ## Źródło

    J. Skrzypecki, D. D. Koch and L. Wang
    Performance of formulas included in the ESCRS intraocular lens power calculator
    J Cataract Refract Surg 2024 Vol. 50 Issue 12 Pages 1224-1229
${audienceInstructions}

Required JSON format:
{
  "title": "Descriptive article title in Polish",
  "content": "Full COMPLETE article in markdown (${contentWordCountDescription}, with ## headings, bullet points, and figure placeholders like ${getFigurePlaceholderUrl(1)})",
  "excerpt": "2-3 sentence summary, max 160 characters",
  "seoMeta": {
    "title": "Short SEO title, max 60 chars",
    "description": "Unique meta description, max 160 chars",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "One of: ${validCategories.join(' | ')}",
  "coverImagePrompt": "Detailed English prompt for cover image.",
  "figures": [
    {
      "id": "figure_1",
      "type": "illustration or chart",
      "alt": "Alt text in Polish",
      "caption": "Short caption in Polish",
      "placeholder": "${getFigurePlaceholderUrl(1)}",
      "prompt": "Medical illustration or data visualization prompt in English. ${targetAudience === 'professional' ? 'PRIORITIZE data charts/graphs. Example: \"Bar chart comparing IOL formula performance. X-axis: Cooke K6, Barrett Universal II, EVO, Kane. Y-axis: SD of PEs (D). Data values: 12, 147, 1227, 183. Label specific bars with formula names.\" Use exact values from PDF.' : 'CRITICAL: Pure visual illustration only - absolutely NO TEXT, NO LABELS, NO WORDS, NO NUMBERS. Clean medical illustration.'}"
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
- MUST include a "## Źródło" section at the END of the content with the original article reference extracted from the PDF.
- Reference format: Authors (one line), Title (one line), Journal Year Vol. X Issue Y Pages Z-W (one line).

Document excerpt:
${normalizedPdfContent}

Required JSON format:
{
  "title": "Article title",
  "content": "Full article content in markdown format (must include ## Źródło section at the end)",
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
    content = `# ${title}\n\nNie udało sie wygenerować pełnej treści. Spróbuj ponownie z innym dokumentem.`
  }

  if (targetAudience === 'professional') {
    const currentWordCount = countWords(content)
    if (currentWordCount > 0 && currentWordCount < 430) {
      console.log(`[gemini] Professional article below target length (${currentWordCount} words); expanding to about 500 words`)
      try {
        const expansion = await generateContentWithFallback({
          systemPrompt,
          prefer,
          prompt:
            `Expand the following Polish professional ophthalmology article to about 500 words while preserving medical accuracy.\n` +
            `Return ONLY the improved markdown content, not JSON.\n` +
            `EXPANSION RULES - READ CAREFULLY:\n` +
            `1. Use only information supported by the source document below. Do not fabricate studies, citations, values, or clinical claims.\n` +
            `2. Permitted expansion strategies:\n` +
            `- Add only the most important statistical methodology already mentioned.\n` +
            `- Add only essential patient demographics already stated.\n` +
            `- Detail exclusion criteria already listed in the Methods section.\n` +
            `- Expand subgroup findings already mentioned, adding exact n, RMSAE values, and p-values from source tables.\n` +
            `- Elaborate on limitations already named using document-grounded explanation.\n` +
            `3. Forbidden expansion strategies:\n` +
            `- Do not introduce any formula not already in the article.\n` +
            `- Do not add any numeric value not already in the article unless it appears verbatim in the source document below.\n` +
            `- Do not reference any other study or author not in the article.\n` +
            `- Do not add clinical interpretation beyond what the paper's Discussion section supports.\n` +
            `- Do not invent patient quotes, surgeon quotes, or anecdotes.\n` +
            `4. Keep any figure placeholder URLs or {{CHART:...}} tokens exactly as-is.\n` +
            `5. Keep the professional structure: Streszczenie redakcyjne, Metodyka i populacja, Kluczowe wyniki, Interpretacja kliniczna, Ograniczenia, Zrodlo.\n` +
            `6. After expanding, verify that every numeric value appears verbatim in either the original short article or the source document. If not, remove it.\n\n` +
            `Source document:\n${normalizedPdfContent}${chartContext}\n\n` +
            `Article to expand:\n${content}`,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 5000,
          },
        })

        const expandedContent = expansion.result.response.text().trim()
        if (countWords(expandedContent) > currentWordCount) {
          content = expandedContent
          console.log(`[gemini] Professional article expanded to ${countWords(content)} words`)
        }
      } catch (error) {
        console.warn('[gemini] Professional article expansion failed:', error)
      }
    }
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
  if (generateImage && !generatedImageUrl) {
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

  // For professional articles: Use Chart.js to generate accurate data charts
  // For patient articles: Use AI image generation for clean anatomical illustrations
  console.log(`[gemini] Chart rendering check: generateImage=${generateImage}, targetAudience=${targetAudience}, extractedChartData.length=${extractedChartData.length}`)
  if (generateImage && targetAudience === 'professional' && extractedChartData.length > 0) {
    try {
      console.log('[gemini] Generating chart images from pre-extracted data...')
      const { generateAndUploadChart } = await import('@/lib/charts/chart-uploader')
      const { enforceChartTypeVariety, validateChartData } = await import('@/lib/charts/data-extractor')
      const renderableCharts = enforceChartTypeVariety(
        extractedChartData.filter((extractedChart, index) => {
          // Validate chart data to prevent AI hallucination
          if (!validateChartData(extractedChart)) {
            console.warn(`[gemini] Chart ${index + 1} failed validation, skipping`)
            return false
          }
          return true
        })
      )

      for (let i = 0; i < renderableCharts.length; i++) {
        const extractedChart = renderableCharts[i]

        try {
          const chartId = `chart-${i + 1}`
          const placeholder = getFigurePlaceholderUrl(i + 1)
          const chartToken = `{{CHART:${extractedChart.id || `chart_${i + 1}`}:${extractedChart.chartType}}}`

          console.log(`[gemini] Generating chart ${i + 1}: ${extractedChart.chartTitle} (${extractedChart.chartType})`)
          const url = await generateAndUploadChart(
            extractedChart.data,
            extractedChart.chartTitle,
            chartId,
            extractedChart.chartType  // Pass the AI-selected chart type
          )

          const alt = `Wykres: ${extractedChart.chartTitle}`
          const captionLine = extractedChart.sourceDescription ? `\n\n*${sanitizeChartCaption(extractedChart.sourceDescription)}*` : ''
          const markdownImage = `![${alt}](${url})${captionLine}`

          if (content.includes(placeholder)) {
            content = content.split(placeholder).join(markdownImage)
            console.log(`[gemini] Chart ${i + 1} injected into content: ${url}`)
          } else if (content.includes(chartToken)) {
            content = content.split(chartToken).join(markdownImage)
            console.log(`[gemini] Chart ${i + 1} injected into content via chart token: ${url}`)
          } else {
            console.warn(`[gemini] Placeholder ${placeholder} or token ${chartToken} not found in content`)
            content = `${content.trim()}\n\n${markdownImage}`
            console.log(`[gemini] Chart ${i + 1} appended to content: ${url}`)
          }
        } catch (error) {
          console.error(`[gemini] Failed to generate/upload chart ${i + 1}:`, error)
        }
      }
    } catch (error) {
      console.error('[gemini] Chart generation failed:', error)
    }
  } else if (generateImage && targetAudience === 'professional') {
    console.log('[gemini] No chart data found in PDF, skipping chart generation')
  }

  if (generateImage && targetAudience === 'patient') {
    // Patient articles: use AI image generation for anatomical illustrations
    const limitedFigures = figures.slice(0, 3)
    for (let i = 0; i < limitedFigures.length; i++) {
      const figure = limitedFigures[i]
      if (!figure?.prompt) continue

      try {
        const url = await generateAndUploadImagen(
          figure.prompt,
          figure.id || `figure-${i + 1}`,
          'ai-figure',
          'illustration'
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
  }

  // Safety net: remove any leftover figure placeholders so users don't see them.
  content = content
    .replace(/\{\{FIGURE_\d+_URL\}\}/g, '')
    .replace(/\{\{CHART:[^}]+:[^}]+\}\}/g, '')
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
  const lengthInstruction = targetAudience === 'professional'
    ? 'For professional content, preserve or expand the article to about 500 words using only supported clinical detail. '
    : ''

  const { result } = await generateContentWithFallback({
    systemPrompt,
    prefer,
    prompt:
      `Improve and enhance the following Polish article content while maintaining the same message and information. ` +
      lengthInstruction +
      `Make it more engaging and well-structured. Return only the improved markdown content:\n\n${content}`,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: targetAudience === 'professional' ? 5000 : 2048,
    },
  })

  return result.response.text() || content
}
