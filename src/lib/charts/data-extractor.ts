import Anthropic from '@anthropic-ai/sdk'
import { ChartData } from './chart-generator'

export interface ExtractedChartData {
  chartTitle: string
  chartType: 'bar' | 'line' | 'scatter'
  data: ChartData
  sourceDescription: string
}

/**
 * Extracts chart data from PDF content using Claude AI
 * Focuses on finding numerical data suitable for bar charts
 * @param pdfContent The text content from the PDF
 * @param maxCharts Maximum number of charts to extract (default: 3)
 * @returns Array of extracted chart data
 */
export async function extractChartDataFromPDF(
  pdfContent: string,
  maxCharts: number = 3
): Promise<ExtractedChartData[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const anthropic = new Anthropic({ apiKey })

  const prompt = `Analyze the following medical/scientific document and extract up to ${maxCharts} sets of numerical data that would be suitable for data visualization as bar charts, line graphs, or scatter plots.

CRITICAL REQUIREMENTS:
1. Extract ONLY data that is explicitly present in the document - DO NOT make up or estimate any numbers
2. Prefer data that shows comparisons, trends, or statistical outcomes
3. For each chart, extract:
   - Chart title (concise, descriptive)
   - Chart type (bar, line, or scatter - prefer bar charts)
   - Labels (x-axis categories or groups)
   - Values (exact numbers from the document)
   - Dataset label (what the values represent)
   - Source description (where in the document this data came from)

4. If the document contains tables with numerical data, extract those
5. If the document mentions statistical results (means, standard deviations, p-values), extract those
6. Focus on data that would be meaningful for ophthalmology professionals

Return ONLY a valid JSON array with this exact structure:
[
  {
    "chartTitle": "Clear, concise title",
    "chartType": "bar",
    "sourceDescription": "Table 1: Comparison of IOL formulas",
    "data": {
      "labels": ["Label1", "Label2", "Label3"],
      "datasets": [
        {
          "label": "Dataset name",
          "data": [12.5, 15.3, 18.7]
        }
      ]
    }
  }
]

If NO suitable numerical data is found in the document, return an empty array: []

Document content:
${pdfContent}

Return ONLY the JSON array, no additional text or markdown.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      { role: 'user', content: prompt },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]'

  // Extract JSON from response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/)
  const jsonStr = jsonMatch ? jsonMatch[0] : '[]'

  try {
    const extractedData: ExtractedChartData[] = JSON.parse(jsonStr)
    return extractedData.slice(0, maxCharts)
  } catch (error) {
    console.error('Failed to parse chart data extraction:', error)
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
