import OpenAI from 'openai'
import { ChartData } from './chart-generator'

export interface ExtractedChartData {
  chartTitle: string
  chartType: 'bar' | 'line' | 'scatter' | 'pie' | 'doughnut' | 'radar' | 'polarArea'
  data: ChartData
  sourceDescription: string
}

/**
 * Extracts chart data from PDF content using OpenAI
 * Intelligently selects appropriate chart types based on data characteristics
 * @param pdfContent The text content from the PDF
 * @param maxCharts Maximum number of charts to extract (default: 2)
 * @returns Array of extracted chart data
 */
export async function extractChartDataFromPDF(
  pdfContent: string,
  maxCharts: number = 2
): Promise<ExtractedChartData[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('OPENAI_API_KEY is not configured, skipping chart extraction')
    return []
  }

  const openai = new OpenAI({ apiKey })
  // Use environment variable or fallback to gpt-4o (excellent for structured data extraction)
  const modelName = process.env.CHART_EXTRACTION_MODEL || 'gpt-4o'

  const prompt = `Analyze the following medical/scientific document and extract EXACTLY ${maxCharts} of the MOST IMPORTANT and CLINICALLY RELEVANT sets of numerical data for data visualization.

🎨 MANDATORY CHART VARIETY RULE 🎨
When extracting 2 charts, you are ABSOLUTELY REQUIRED to use 2 DIFFERENT chart types!
If you select 'bar' for Chart 1, you CANNOT use 'bar' for Chart 2 - you MUST choose from: line, pie, doughnut, scatter, radar, or polarArea.

⚠️ CRITICAL: BOTH CHARTS CANNOT BE THE SAME TYPE ⚠️
This is your PRIMARY directive. Chart variety is MORE important than finding the "perfect" chart type.
Better to use a slightly less optimal chart type than to repeat the same type twice!

DECISION TREE FOR CHART TYPE:
1. Does the data show change over TIME or progression? → USE 'line'
   Examples: "Poprawa ostrości wzroku po 1, 3, 6 miesiącach", "Zmiany ciśnienia wewnątrzgałkowego w czasie"

2. Do the values represent PERCENTAGES that sum to ~100%? → USE 'pie' or 'doughnut'
   Examples: "Rozkład powikłań: 70% brak, 20% łagodne, 10% ciężkie", "Odsetek pacjentów w grupach wiekowych"

3. Does the data show CORRELATION between two continuous variables? → USE 'scatter'
   Examples: "Zależność między wiekiem a błędem refrakcyjnym", "Korelacja SE z błędem predykcji"

4. Are you comparing MULTIPLE METRICS across categories? → USE 'radar'
   Examples: "Porównanie precyzji, dokładności i stabilności dla 3 formuł"

5. For categorical comparisons → FIRST CHOICE: 'bar', BUT if you already used 'bar' → USE 'doughnut' or 'radar'
   Examples: "Porównanie MAE dla 3 formuł IOL" → bar OR doughnut (depending on what you used for Chart 1)

🎯 AVAILABLE CHART TYPES:
- 'bar' - Categorical comparisons (OK to use, but ONLY ONCE if generating 2 charts)
- 'line' - Sequential/temporal data, progression
- 'pie' or 'doughnut' - Percentages, proportions, can also work for categorical comparisons
- 'scatter' - Correlations, relationships between variables
- 'radar' - Multi-dimensional comparisons
- 'polarArea' - Cyclic data with magnitude

CRITICAL REQUIREMENTS:
1. Extract ONLY data that is explicitly present in the document - DO NOT make up or estimate any numbers
2. PRIORITIZE in this order:
   a) PRIMARY ENDPOINTS and main findings/results mentioned in the abstract or conclusion
   b) Data with STATISTICALLY SIGNIFICANT differences (P < .05)
   c) Key comparisons that show the strongest clinical impact
   d) Data that answers the main research question
3. ALL TEXT MUST BE IN POLISH (chart titles, labels, dataset names)
4. For each chart, extract:
   - Chart title (concise, descriptive, IN POLISH)
   - Chart type - FOLLOW THE DECISION TREE ABOVE! Choose based on data structure, not convenience
   - Labels (x-axis categories or groups - keep formula names in English, but descriptive text in Polish)
   - Values (exact numbers from the document)
   - Dataset label (what the values represent - IN POLISH, e.g., "Odchylenie standardowe (D)" or "Procent oczu w granicach ±0.5 D")
   - Source description (for internal reference - IN POLISH)
5. If the document contains tables with numerical data, extract those
6. If the document mentions statistical results (means, standard deviations, p-values), extract those
7. Focus on data that would be meaningful for ophthalmology professionals
8. 🔴 ABSOLUTELY MANDATORY 🔴: If extracting 2 charts, you MUST use 2 DIFFERENT chart types!
   - Example: If Chart 1 is 'bar', Chart 2 MUST be 'line', 'pie', 'doughnut', 'scatter', 'radar', or 'polarArea'
   - Example: If Chart 1 is 'line', Chart 2 can be anything EXCEPT 'line'
9. CHECKING YOUR WORK: Before returning the JSON, verify that chartType for Chart 1 ≠ chartType for Chart 2

Return ONLY a valid JSON object with this exact structure (ALL TEXT IN POLISH):
{
  "charts": [
    {
      "chartTitle": "Zmiany ciśnienia wewnątrzgałkowego w czasie",
      "chartType": "line",
      "sourceDescription": "IOP w baseline, 3 i 6 miesięcy",
      "data": {
        "labels": ["Baseline", "3 miesiące", "6 miesięcy"],
        "datasets": [
          {
            "label": "Ciśnienie wewnątrzgałkowe (mmHg)",
            "data": [20.5, 16.8, 15.2]
          }
        ]
      }
    },
    {
      "chartTitle": "Rozkład powikłań pooperacyjnych",
      "chartType": "pie",
      "sourceDescription": "Procent pacjentów z różnymi poziomami powikłań",
      "data": {
        "labels": ["Brak powikłań", "Łagodne", "Umiarkowane", "Ciężkie"],
        "datasets": [
          {
            "label": "Procent pacjentów (%)",
            "data": [75, 15, 8, 2]
          }
        ]
      }
    }
  ]
}

REAL-WORLD EXAMPLES WITH VARIETY ENFORCED:
✓ Chart 1: "Compare MAE for 3 IOL formulas" → 'bar' + Chart 2: "Compare centroid error" → 'doughnut' or 'radar' (NOT bar again!)
✓ Chart 1: "Visual acuity at 1, 3, 6, 12 months" → 'line' + Chart 2: "Complication rate distribution" → 'pie'
✓ Chart 1: "Treatment A vs B outcomes" → 'bar' + Chart 2: "Age correlation with outcomes" → 'scatter'
✓ Chart 1: "Success rates" → 'doughnut' + Chart 2: "Performance metrics" → 'radar'

❌ WRONG: Chart 1: 'bar' + Chart 2: 'bar' - THIS IS NOT ALLOWED!
❌ WRONG: Chart 1: 'line' + Chart 2: 'line' - THIS IS NOT ALLOWED!
✓ CORRECT: Chart 1: 'bar' + Chart 2: 'doughnut' - DIFFERENT TYPES!

IMPORTANT:
- All chart titles MUST be in Polish
- All dataset labels MUST be in Polish (e.g., "Odchylenie standardowe (D)", "Procent oczu (%)", "RMSAE", etc.)
- Formula names in x-axis labels can stay in English (e.g., "Cooke K6", "Barrett", "Kane")
- The sourceDescription is for internal tracking only. The final article will use sequential figure numbering (Rysunek 1, Rysunek 2, Rysunek 3).

If NO suitable numerical data is found in the document, return: {"charts": []}

Document content:
${pdfContent}

Return ONLY the JSON object, no additional text or markdown.`

  try {
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are a precise data extraction assistant. Extract only factual numerical data from documents. Never hallucinate or make up numbers. ALL chart titles and labels must be in Polish (język polski).'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content || '{}'

    // Parse the JSON response
    let parsedResponse: any
    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      console.warn('[chart-extractor] Failed to parse JSON response')
      return []
    }

    // Handle both direct array or object with 'charts' key
    const extractedData: ExtractedChartData[] = Array.isArray(parsedResponse)
      ? parsedResponse
      : (parsedResponse.charts || [])

    return extractedData.slice(0, maxCharts)
  } catch (error) {
    console.error('Failed to extract chart data:', error)
    return []
  }
}

/**
 * Validates that extracted chart data contains real values
 * Helps prevent AI hallucination by checking data structure
 */
export function validateChartData(chartData: ExtractedChartData): boolean {
  if (!chartData.data?.labels || !Array.isArray(chartData.data.labels)) {
    return false
  }

  if (!chartData.data?.datasets || !Array.isArray(chartData.data.datasets)) {
    return false
  }

  for (const dataset of chartData.data.datasets) {
    if (!Array.isArray(dataset.data)) {
      return false
    }

    // Check that all values are real numbers
    if (dataset.data.some((val) => typeof val !== 'number' || isNaN(val))) {
      return false
    }

    // Check that data length matches labels length
    if (dataset.data.length !== chartData.data.labels.length) {
      return false
    }
  }

  return true
}
