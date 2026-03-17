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
   - Chart type - INTELLIGENTLY CHOOSE based on data characteristics:
     * 'bar' - Comparing values across categories (e.g., comparing different IOL formulas, treatment groups)
     * 'line' - Showing trends over time or continuous progression (e.g., visual acuity over months, age-related changes)
     * 'pie' - Showing parts of a whole, percentages that sum to 100% (e.g., distribution of complications, patient demographics)
     * 'doughnut' - Similar to pie but with emphasis on proportions (e.g., success rates vs failures)
     * 'radar' - Comparing multiple variables across categories (e.g., multi-dimensional performance metrics)
     * 'scatter' - Showing correlation or relationship between two variables (e.g., age vs outcome, SE vs prediction error)
     * 'polarArea' - Showing cyclic or periodic data with magnitude (rarely used in medical contexts)
   - Labels (x-axis categories or groups - keep formula names in English, but descriptive text in Polish)
   - Values (exact numbers from the document)
   - Dataset label (what the values represent - IN POLISH, e.g., "Odchylenie standardowe (D)" or "Procent oczu w granicach ±0.5 D")
   - Source description (for internal reference - IN POLISH)
5. If the document contains tables with numerical data, extract those
6. If the document mentions statistical results (means, standard deviations, p-values), extract those
7. Focus on data that would be meaningful for ophthalmology professionals
8. IMPORTANT: Use different chart types when appropriate - do NOT default to bar charts for all data

Return ONLY a valid JSON object with this exact structure (ALL TEXT IN POLISH):
{
  "charts": [
    {
      "chartTitle": "Porównanie odchylenia standardowego błędów predykcji dla formuł IOL",
      "chartType": "bar",
      "sourceDescription": "Wartości SD porównujące różne formuły obliczeniowe IOL",
      "data": {
        "labels": ["Cooke K6", "Pearl-DGS", "EVO"],
        "datasets": [
          {
            "label": "Odchylenie standardowe (D)",
            "data": [0.44, 0.46, 0.47]
          }
        ]
      }
    },
    {
      "chartTitle": "Rozkład powikłań pooperacyjnych",
      "chartType": "pie",
      "sourceDescription": "Procent pacjentów z różnymi powikłaniami",
      "data": {
        "labels": ["Brak powikłań", "Łagodne", "Umiarkowane", "Ciężkie"],
        "datasets": [
          {
            "label": "Procent pacjentów",
            "data": [75, 15, 8, 2]
          }
        ]
      }
    }
  ]
}

EXAMPLES OF APPROPRIATE CHART TYPE SELECTION:
- Comparison data (IOL formulas, treatment groups) → 'bar'
- Time series (follow-up over months) → 'line'
- Percentage breakdown (complication types, demographics) → 'pie' or 'doughnut'
- Correlation (age vs error, SE vs outcome) → 'scatter'
- Multi-dimensional comparison → 'radar'

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
      temperature: 0.3,
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
