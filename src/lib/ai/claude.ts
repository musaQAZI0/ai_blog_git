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

NUMERIC ACCURACY - MANDATORY:
6. Before writing any numeric value (SD, p-value, percentage, mean, n, score, visual acuity, dose, or follow-up interval), trace it to a specific table, figure, abstract, or results paragraph in the document. If you cannot confirm a number exists verbatim in the document, omit it entirely rather than approximate. Never report a value for one group, endpoint, or intervention that belongs to another row or column in the same table.

NON-SIGNIFICANT COMPARISONS - MANDATORY:
7. Do not describe a group, treatment, lens, drug, formula, or device as "better", "superior", or "improved" unless the relevant pairwise comparison is statistically significant. If only the overall p-value is significant, state only that the overall difference was significant and do not assign superiority unless pairwise p-values support it. For every statistically significant finding you report, explicitly state which clinically relevant comparisons did NOT reach significance (p>=0.05) when reported.

ENDPOINT REPORTING - MANDATORY:
8. Identify the actual primary and secondary endpoints used in the source document. Do not assume endpoints such as RMSAE, prediction error, subgroup eye length, formula comparison, or IOL type unless they are explicitly present in the paper. When subgroups are explicitly analyzed, report both the main endpoint and notable secondary endpoint findings without cherry-picking only the most favorable result.
8a. Preserve exact endpoint wording in titles, excerpts, headings, and key claims. Do not shorten a specific endpoint such as "mean vector magnitude prediction error" to a broader claim such as "prediction error" or "accuracy" unless the source uses that broader endpoint.
8b. P-value scope must be exact. Never write "all comparisons p<..." unless the source explicitly states that all relevant pairwise comparisons share that threshold. Distinguish overall p-values, pairwise p-values, subgroup p-values, and measured-versus-predicted comparisons.

CLINICAL VS STATISTICAL INTERPRETATION:
9. Separate statistical significance from clinical relevance. If the paper says a statistically significant difference is small, minor, modest, or unlikely to be clinically meaningful, include that qualification. Do not convert statistical significance into clinical importance unless the authors support it.
For the Vivity contrast-sensitivity trade-off, if the source describes the absolute difference as small or unlikely clinically meaningful, write that qualification explicitly. Do not phrase it simply as "the price/cost is reduced contrast sensitivity."

LIMITATIONS - MANDATORY:
10. In "Ograniczenia", separate limitations explicitly stated or directly documented in the paper from editorially inferred limitations. Mark inferred limitations as "ograniczenie interpretacyjne" or "wniosek redakcyjny".

SOURCE STATUS - MANDATORY:
11. Preserve the publication status shown in the source. If the document is a manuscript draft, preprint, accepted manuscript, conference abstract, or submission without final volume/pages/DOI, state that status and do not invent final citation details.`

export async function generateArticleWithClaude(
  pdfContent: string,
  targetAudience: TargetAudience,
  generateImage: boolean = true
): Promise<AIGenerationResponse> {
  const systemPrompt = targetAudience === 'patient'
    ? PATIENT_SYSTEM_PROMPT
    : PROFESSIONAL_SYSTEM_PROMPT

  const figureInstructions =
    targetAudience === 'professional'
      ? `- Include MAXIMUM 2 figures. PRIORITIZE data charts/graphs (bar charts, line graphs, scatter plots, etc.) that visualize REAL DATA from the PDF source document.
- CRITICAL for charts/graphs: Include data labels and text ONLY if they come from the source document. Use EXACT values from the PDF - do NOT make up or estimate numbers.
- Keep labels concise and to the point. Request simple, clear text (e.g., "Baseline: 20.5 mmHg, Month 6: 15.2 mmHg", "Cooke K6", "Barrett Universal II").
- Focus on DATA VISUALIZATION (charts showing statistics, results, comparisons) rather than anatomical illustrations.
- Every chart must include the source table/figure number when available, exact units, whether values are mean, mean ± SD, percentage, or score, and p-values only when present in the source.
- For visual acuity charts using logMAR, always state that lower logMAR values indicate better visual acuity. For discrete visual acuity endpoints such as UDVA, CDVA, UIVA, DCIVA, UNVA, and DCNVA, NEVER use a line chart. Use a grouped bar chart only (chartType "bar" with multiple datasets). Line charts are allowed only for true ordered curves such as defocus curves across diopters.`
      : `- Include up to 3 figures (simple anatomical illustrations ONLY).
- CRITICAL: ALL figures MUST be completely clean - NO TEXT, NO LABELS, NO WORDS, NO NUMBERS, NO DATA.
- Request only pure visual illustrations without any text elements.
- NO charts or data visualizations.`

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
- Identify the actual endpoints used in the source document; do not assume formula-study endpoints or subgroup structures unless explicitly present.
- Preserve exact endpoint wording in the title, excerpt, headings, chart captions, and key claims; do not replace a specific endpoint with a broader generic claim.
- Do not claim superiority for any comparison unless the relevant pairwise p-value supports it. State non-significant comparisons when clinically relevant.
- Scope p-values precisely: distinguish overall, pairwise, subgroup, and method-comparison p-values. Never say "all comparisons" unless the source explicitly says all relevant comparisons meet that threshold.
- When reporting EMV vs monofocal intermediate vision, or any similar multi-endpoint comparison, distinguish uncorrected and corrected endpoints (for example UIVA vs DCIVA). Do not summarize both as significant unless both pairwise p-values are significant.
- Do not write "klinicznie istotna poprawa" unless the paper explicitly supports clinical meaningfulness. For small but significant differences, use "statystycznie istotna, umiarkowana poprawa" and name the exact endpoint.
- For charted outcomes, name the source table/figure and preserve the direction of interpretation (for example, lower logMAR means better visual acuity).
- For ordered threshold/proportion charts, describe them as ordered cutoffs or cumulative thresholds, not as time trends unless the x-axis is time.
- For charts, use the provided chart placeholder URL or a token in the format {{CHART:dataset_name:chart_type}}.
`
      : `AudienceInstructions (patient):
- Keep language simple and reassuring.
- Explain any unavoidable medical terms briefly.
`

  const targetWordCount = targetAudience === 'professional'
    ? '~500 words for the main content'
    : '~400 words for the main content (aim for 380-450)'

  const userPrompt = `Based on the following medical document content, create a blog article/review in Polish.
Target word count: ${targetWordCount}.
IMPORTANT: word count refers ONLY to the "content" field (the markdown article body), excluding title, excerpt, SEO meta, tags/categories, and excluding URLs/placeholders.

Document content: ${pdfContent}

IMPORTANT:
- Return a SINGLE valid JSON object (no markdown, no code fences, no extra text).
${figureInstructions}
- In "content" markdown, include each figure placeholder exactly once as an image URL token (not the full markdown), e.g. https://www.google.com/search?q=%7B%7BFIGURE_1_URL%7D%7D.
- MUST include a "## Źródło" section at the END of the content with the original article reference extracted from the PDF.
- Reference format: Authors (one line), Title (one line), Journal. Year;volume(issue if available):pages if true page range is available. doi:DOI if available.
- Never write "Pages" followed by an article ID, manuscript ID, DOI suffix, or number like S595557/595557. If no true page range is available, omit pages and include doi instead.
- If the source says manuscript draft, preprint, accepted manuscript, conference abstract, or submission and does not provide final bibliographic details, keep that status in the source section and do not invent year/volume/pages/DOI.
- Example reference format:
  ## Źródło

  J. Skrzypecki, D. D. Koch and L. Wang
  Performance of formulas included in the ESCRS intraocular lens power calculator
  J Cataract Refract Surg. 2024;50(12):1224-1229. doi:10.xxxx/example
${audienceInstructions}

Required JSON format:
{
  "title": "Article title",
  "content": "Full article content in markdown format (must include placeholders like https://www.google.com/search?q=%7B%7BFIGURE_1_URL%7D%7D where images should appear)",
  "excerpt": "A brief 2-3 sentence summary (max 160 characters)",
  "seoMeta": {
    "title": "SEO optimized title (max 60 characters)",
    "description": "SEO meta description (max 160 characters)",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "suggestedTags": ["tag1", "tag2"],
  "suggestedCategory": "Category name",
  "coverImagePrompt": "A short prompt for a cover image relevant to the article.",
  "figures": [
    {
      "id": "figure_1",
      "type": "illustration or chart",
      "alt": "Alt text in Polish",
      "caption": "Short caption in Polish",
      "placeholder": "https://www.google.com/search?q=%7B%7BFIGURE_1_URL%7D%7D",
      "prompt": "Medical illustration or data visualization prompt in English. ${targetAudience === 'professional' ? 'PRIORITIZE data charts/graphs. Example: \"Bar chart comparing IOL formula performance. X-axis: Cooke K6, Barrett Universal II, EVO, Kane. Y-axis: SD of PEs (D). Data values: 12, 147, 1227, 183. Label specific bars with formula names.\" Use exact values from PDF.' : 'CRITICAL: Pure visual illustration only - absolutely NO TEXT, NO LABELS, NO WORDS, NO NUMBERS. Clean medical illustration.'}"
    }
  ]
}`

  const anthropic = getAnthropicClient()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: targetAudience === 'professional' ? 6500 : 4000,
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

  let content: string = articleData.content || ''

  // Safety net: remove any leftover figure placeholders
  content = content
    .replace(/\{\{FIGURE_\d+_URL\}\}/g, '')
    .replace(/https?:\/\/www\.google\.com\/search\?q=%7B%7BFIGURE_\d+_URL%7D%7D/g, '')
    .replace(/\n{3,}/g, '\n\n')

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
