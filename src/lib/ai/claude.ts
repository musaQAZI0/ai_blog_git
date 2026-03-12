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

export async function generateArticleWithClaude(
  pdfContent: string,
  targetAudience: TargetAudience
): Promise<AIGenerationResponse> {
  const systemPrompt = targetAudience === 'patient'
    ? PATIENT_SYSTEM_PROMPT
    : PROFESSIONAL_SYSTEM_PROMPT

  const figureInstructions =
    targetAudience === 'professional'
      ? `- Include up to 3 figures. You MAY include charts/graphs that visualize REAL DATA from the PDF source document.
- CRITICAL for charts/graphs: Include data labels and text ONLY if they come from the source document. Use EXACT values from the PDF - do NOT make up or estimate numbers.
- Keep labels concise and to the point. Request simple, clear text (e.g., "Baseline: 20.5 mmHg, Month 6: 15.2 mmHg").
- For anatomical illustrations: You may include simple anatomical labels (e.g., "Cornea", "Lens", "Retina") - keep labels short and accurate.`
      : `- Include up to 3 figures (simple anatomical illustrations ONLY).
- CRITICAL: ALL figures MUST be completely clean - NO TEXT, NO LABELS, NO WORDS, NO NUMBERS, NO DATA.
- Request only pure visual illustrations without any text elements.
- NO charts or data visualizations.`

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
${figureInstructions}
- In "content" markdown, include each figure placeholder exactly once as an image URL token (not the full markdown), e.g. https://www.google.com/search?q=%7B%7BFIGURE_1_URL%7D%7D.
- MUST include a "## Źródło" section at the END of the content with the original article reference extracted from the PDF.
- Reference format: Authors (one line), Title (one line), Journal Year Vol. X Issue Y Pages Z-W (one line).
- Example reference format:
  ## Źródło

  J. Skrzypecki, D. D. Koch and L. Wang
  Performance of formulas included in the ESCRS intraocular lens power calculator
  J Cataract Refract Surg 2024 Vol. 50 Issue 12 Pages 1224-1229
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
      "prompt": "Medical illustration or data visualization prompt in English. ${targetAudience === 'professional' ? 'For charts: include specific data labels from the PDF source (use exact values). For anatomical illustrations: may include simple labels like \'Cornea\', \'Lens\', \'Retina\'.' : 'CRITICAL: Pure visual illustration only - absolutely NO TEXT, NO LABELS, NO WORDS, NO NUMBERS. Clean medical illustration.'}"
    }
  ]
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
