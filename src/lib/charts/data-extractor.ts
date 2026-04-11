import OpenAI from 'openai'
import { ChartData, ChartType, BoxPlotDataPoint } from './chart-generator'

export interface ExtractedChartData {
  chartTitle: string
  chartType: ChartType
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
If you select 'bar' for Chart 1, you CANNOT use 'bar' for Chart 2 - you MUST choose from the other types.

⚠️ CRITICAL: BOTH CHARTS CANNOT BE THE SAME TYPE ⚠️
This is your PRIMARY directive. Chart variety is MORE important than finding the "perfect" chart type.
Better to use a slightly less optimal chart type than to repeat the same type twice!

DECISION TREE FOR CHART TYPE:
1. Does the data show DISTRIBUTION STATISTICS (min, Q1, median, Q3, max) for groups? → USE 'boxplot'
   Examples: "Rozkład błędu predykcji dla Barrett, Kane, Cooke K6", "Rozkład ciśnienia wewnątrzgałkowego w grupach"
   ⚠️ boxplot requires EXACTLY this data format for each group: {"min": number, "q1": number, "median": number, "q3": number, "max": number}

2. Does the data show MULTIPLE PERCENTAGES summing to ~100% for EACH formula/group? → USE 'stackedBar'
   Examples: "% oczu w granicach ±0.25D, ±0.50D, ±1.0D dla każdej formuły", "Rozkład ciężkości powikłań na grupę"
   ⚠️ stackedBar requires MULTIPLE datasets (one per stack layer), each with ONE value per label

3. Does the data compare 7 or MORE categories? → USE 'horizontalBar'
   Examples: "Porównanie MAE dla 8+ formuł IOL", "Ranking formuł wg dokładności"

4. Does the data show change over TIME or progression? → USE 'line'
   Examples: "Poprawa ostrości wzroku po 1, 3, 6 miesiącach", "Zmiany ciśnienia wewnątrzgałkowego w czasie"

5. Do the values represent PERCENTAGES that sum to ~100%? → USE 'pie' or 'doughnut'
   Examples: "Rozkład powikłań: 70% brak, 20% łagodne, 10% ciężkie", "Odsetek pacjentów w grupach wiekowych"

6. Are you comparing MULTIPLE METRICS across categories? → USE 'radar'
   Examples: "Porównanie precyzji, dokładności i stabilności dla 3 formuł"

7. For categorical comparisons with fewer than 7 categories → USE 'bar'
   Examples: "Porównanie MAE dla 3-6 formuł IOL"

🎯 AVAILABLE CHART TYPES (ONLY THESE 8 ARE ALLOWED):
- 'bar' - Vertical bar chart for categorical comparisons (< 7 categories)
- 'horizontalBar' - Horizontal bar chart for comparing many categories (7+ categories), better readability for long names
- 'stackedBar' - Stacked bar chart showing composition (e.g., % eyes within ±0.25D / ±0.50D / ±1.0D per formula)
- 'boxplot' - Box-and-whisker plot showing data distribution (min, Q1, median, Q3, max) — GOLD STANDARD for medical papers
- 'line' - Sequential/temporal data, progression
- 'pie' or 'doughnut' - Percentages, proportions
- 'radar' - Multi-dimensional comparisons

🚫 DO NOT USE: 'scatter' or 'polarArea' — these chart types are NOT supported!

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
   - Dataset label (what the values represent - IN POLISH)
   - Source description (for internal reference - IN POLISH)
5. If the document contains tables with numerical data, extract those
6. If the document mentions statistical results (means, standard deviations, p-values), extract those
7. Focus on data that would be meaningful for ophthalmology professionals
8. 🔴 ABSOLUTELY MANDATORY 🔴: If extracting 2 charts, you MUST use 2 DIFFERENT chart types!
9. CHECKING YOUR WORK: Before returning the JSON, verify that chartType for Chart 1 ≠ chartType for Chart 2

Return ONLY a valid JSON object with this exact structure (ALL TEXT IN POLISH):
{
  "charts": [
    {
      "chartTitle": "Porównanie MAE formuł IOL",
      "chartType": "bar",
      "sourceDescription": "Tabela 2 — MAE dla każdej formuły",
      "data": {
        "labels": ["Barrett", "Cooke K6", "Kane", "EVO"],
        "datasets": [
          {
            "label": "MAE (D)",
            "data": [0.35, 0.28, 0.31, 0.33]
          }
        ]
      }
    },
    {
      "chartTitle": "Procent oczu w granicach błędu predykcji",
      "chartType": "stackedBar",
      "sourceDescription": "Tabela 3 — procent oczu w granicach ±0.25D, ±0.50D, ±1.0D",
      "data": {
        "labels": ["Barrett", "Cooke K6", "Kane", "EVO"],
        "datasets": [
          {
            "label": "±0.25 D (%)",
            "data": [42, 48, 45, 40]
          },
          {
            "label": "±0.50 D (%)",
            "data": [72, 78, 75, 70]
          },
          {
            "label": "±1.0 D (%)",
            "data": [95, 97, 96, 93]
          }
        ]
      }
    }
  ]
}

EXAMPLE FOR BOXPLOT (when distribution data is available):
{
  "chartTitle": "Rozkład błędu predykcji wg formuły",
  "chartType": "boxplot",
  "sourceDescription": "Statystyki deskryptywne z Tabeli 4",
  "data": {
    "labels": ["Barrett", "Kane", "Cooke K6"],
    "datasets": [
      {
        "label": "Błąd predykcji (D)",
        "data": [
          {"min": -0.8, "q1": -0.2, "median": 0.05, "q3": 0.25, "max": 0.9},
          {"min": -0.6, "q1": -0.15, "median": 0.02, "q3": 0.2, "max": 0.7},
          {"min": -0.7, "q1": -0.18, "median": 0.03, "q3": 0.22, "max": 0.8}
        ]
      }
    ]
  }
}

EXAMPLE FOR HORIZONTAL BAR (when many formulas are compared):
{
  "chartTitle": "Ranking formuł wg MAE",
  "chartType": "horizontalBar",
  "sourceDescription": "Tabela porównawcza MAE 8 formuł",
  "data": {
    "labels": ["Barrett", "Cooke K6", "Kane", "EVO", "Hill-RBF", "Hoffer QST", "Pearl-DGS", "SRK/T"],
    "datasets": [
      {
        "label": "MAE (D)",
        "data": [0.35, 0.28, 0.31, 0.33, 0.30, 0.40, 0.29, 0.45]
      }
    ]
  }
}

REAL-WORLD EXAMPLES WITH VARIETY ENFORCED:
✓ Chart 1: "Compare MAE for IOL formulas" → 'bar' + Chart 2: "% eyes within refractive targets" → 'stackedBar'
✓ Chart 1: "MAE ranking for 8+ formulas" → 'horizontalBar' + Chart 2: "Distribution of prediction errors" → 'boxplot'
✓ Chart 1: "Visual acuity at 1, 3, 6, 12 months" → 'line' + Chart 2: "Complication rate distribution" → 'pie'
✓ Chart 1: "Success rates" → 'doughnut' + Chart 2: "Multi-metric comparison" → 'radar'

❌ WRONG: Chart 1: 'bar' + Chart 2: 'bar' - THIS IS NOT ALLOWED!
❌ WRONG: Chart 1: 'line' + Chart 2: 'line' - THIS IS NOT ALLOWED!
✓ CORRECT: Chart 1: 'bar' + Chart 2: 'stackedBar' - DIFFERENT TYPES!

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

    // Log what AI returned
    console.log('[chart-extractor] ===== EXTRACTED CHART TYPES =====')
    extractedData.forEach((chart, i) => {
      console.log(`[chart-extractor] Chart ${i + 1}: "${chart.chartTitle}" → TYPE: "${chart.chartType}"`)
    })

    // SANITIZE: Force any unsupported chart types to 'bar'
    const SUPPORTED_TYPES = new Set<ChartType>(['bar', 'line', 'pie', 'doughnut', 'radar', 'stackedBar', 'horizontalBar', 'boxplot'])
    for (const chart of extractedData) {
      if (!SUPPORTED_TYPES.has(chart.chartType)) {
        console.error(`[chart-extractor] ⚠️ Unsupported chart type '${chart.chartType}' → forcing to 'bar'`)
        chart.chartType = 'bar'
      }
    }

    // ENFORCE VARIETY: Reject if both charts are the same type
    if (extractedData.length === 2 && extractedData[0].chartType === extractedData[1].chartType) {
      console.error(`[chart-extractor] ⚠️ REJECTED: Both charts are '${extractedData[0].chartType}'. Forcing variety...`)

      // Force the second chart to be different - ONLY safe chart types
      const alternativeTypes: ChartType[] =
        ['line', 'pie', 'doughnut', 'radar', 'stackedBar', 'horizontalBar']

      const firstType = extractedData[0].chartType
      const differentTypes = alternativeTypes.filter(t => t !== firstType)

      // Randomly choose from alternatives for maximum variety
      const randomIndex = Math.floor(Math.random() * differentTypes.length)
      const oldType = extractedData[1].chartType
      extractedData[1].chartType = differentTypes[randomIndex]
      console.error(`[chart-extractor] ✅ FIXED: Changed Chart 2 from '${oldType}' to '${extractedData[1].chartType}' (random selection)`)
    } else if (extractedData.length === 2) {
      console.log(`[chart-extractor] ✅ VARIETY CONFIRMED: Chart 1 is '${extractedData[0].chartType}', Chart 2 is '${extractedData[1].chartType}'`)
    }

    return extractedData.slice(0, maxCharts)
  } catch (error) {
    console.error('Failed to extract chart data:', error)
    return []
  }
}

/**
 * Checks if a data point is a valid BoxPlotDataPoint
 */
function isBoxPlotDataPoint(val: any): val is BoxPlotDataPoint {
  return (
    typeof val === 'object' &&
    val !== null &&
    typeof val.min === 'number' &&
    typeof val.q1 === 'number' &&
    typeof val.median === 'number' &&
    typeof val.q3 === 'number' &&
    typeof val.max === 'number'
  )
}

/**
 * Validates that extracted chart data contains real, meaningful values
 * Helps prevent AI hallucination and empty charts
 */
export function validateChartData(chartData: ExtractedChartData): boolean {
  // Reject unsupported chart types
  const SUPPORTED_TYPES = new Set<ChartType>(['bar', 'line', 'pie', 'doughnut', 'radar', 'stackedBar', 'horizontalBar', 'boxplot'])
  if (!SUPPORTED_TYPES.has(chartData.chartType)) {
    console.warn(`[chart-validator] ❌ Unsupported chart type: '${chartData.chartType}'`)
    return false
  }

  if (!chartData.data?.labels || !Array.isArray(chartData.data.labels)) {
    return false
  }

  // Must have at least 2 data points to be a meaningful chart
  if (chartData.data.labels.length < 2) {
    console.warn(`[chart-validator] ❌ Too few data points: ${chartData.data.labels.length}`)
    return false
  }

  if (!chartData.data?.datasets || !Array.isArray(chartData.data.datasets)) {
    return false
  }

  // Must have at least 1 dataset
  if (chartData.data.datasets.length === 0) {
    console.warn('[chart-validator] ❌ No datasets')
    return false
  }

  // Stacked bar must have at least 2 datasets (stack layers)
  if (chartData.chartType === 'stackedBar' && chartData.data.datasets.length < 2) {
    console.warn('[chart-validator] ❌ stackedBar requires at least 2 datasets (stack layers)')
    return false
  }

  for (const dataset of chartData.data.datasets) {
    if (!Array.isArray(dataset.data)) {
      return false
    }

    // Special validation for boxplot data
    if (chartData.chartType === 'boxplot') {
      // Each data point must be a BoxPlotDataPoint object
      for (const val of dataset.data) {
        if (!isBoxPlotDataPoint(val)) {
          console.warn('[chart-validator] ❌ Invalid boxplot data point — must have {min, q1, median, q3, max}')
          return false
        }
        // Validate ordering: min <= q1 <= median <= q3 <= max
        if (val.min > val.q1 || val.q1 > val.median || val.median > val.q3 || val.q3 > val.max) {
          console.warn(`[chart-validator] ❌ Invalid boxplot ordering: min(${val.min}) <= q1(${val.q1}) <= median(${val.median}) <= q3(${val.q3}) <= max(${val.max})`)
          return false
        }
      }

      // Check that data length matches labels length
      if (dataset.data.length !== chartData.data.labels.length) {
        console.warn(`[chart-validator] ❌ Data length (${dataset.data.length}) doesn't match labels (${chartData.data.labels.length})`)
        return false
      }

      continue // Skip numeric validations for boxplot
    }

    // Standard numeric validations for non-boxplot charts
    // Check that all values are real numbers
    if (dataset.data.some((val) => typeof val !== 'number' || isNaN(val as number))) {
      console.warn('[chart-validator] ❌ Non-numeric values found')
      return false
    }

    // Check that data length matches labels length
    if (dataset.data.length !== chartData.data.labels.length) {
      console.warn(`[chart-validator] ❌ Data length (${dataset.data.length}) doesn't match labels (${chartData.data.labels.length})`)
      return false
    }

    // Reject all-zero data (empty chart)
    const allZero = (dataset.data as number[]).every((val) => val === 0)
    if (allZero) {
      console.warn('[chart-validator] ❌ All values are zero — chart would be empty')
      return false
    }

    // Reject if all values are identical (flat line / useless chart)
    const allSame = (dataset.data as number[]).every((val) => val === (dataset.data as number[])[0])
    if (allSame) {
      console.warn(`[chart-validator] ❌ All values are identical (${(dataset.data as number[])[0]}) — chart would be meaningless`)
      return false
    }
  }

  return true
}
