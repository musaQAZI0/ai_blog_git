import { generateFileName, uploadFile, uploadFileToProvider, type StorageProvider } from '@/lib/storage'
import { generateChartImage, generateSimpleBarChart, type ChartData, type ChartType } from './chart-generator'
import {
  enforceChartTypeVariety,
  extractChartDataFromPDF,
  validateChartData,
  type ExtractedChartData,
} from './data-extractor'

export interface GeneratedChart {
  id: string
  url: string
  title: string
  alt: string
  caption: string
  placeholder: string
  sourceDescription: string
}

/**
 * Uploads a chart buffer to storage (Cloudinary or local)
 * @param chartBuffer PNG buffer from Chart.js
 * @param originalName Original filename
 * @param folderPrefix Folder prefix for storage
 * @returns Public URL of uploaded chart
 */
export async function uploadChartImage(
  chartBuffer: Buffer,
  originalName: string,
  folderPrefix: string = 'ai-chart'
): Promise<string> {
  const fileName = generateFileName(`${originalName}.png`, folderPrefix)
  const mimeType = 'image/png'

  const provider = process.env.AI_STORAGE_PROVIDER as StorageProvider | undefined
  if (provider) {
    return uploadFileToProvider(provider, chartBuffer, fileName, mimeType)
  }

  return uploadFile(chartBuffer, fileName, mimeType)
}

/**
 * Generates chart from data and uploads to storage
 * @param chartData Chart data (labels, datasets, etc.)
 * @param chartTitle Title for the chart
 * @param chartId Unique ID for this chart
 * @param chartType Type of chart
 * @returns Public URL of uploaded chart
 */
export async function generateAndUploadChart(
  chartData: ChartData,
  chartTitle: string,
  chartId: string,
  chartType: ChartType = 'bar'
): Promise<string> {
  // Pie/doughnut charts need more width for legend on the right
  const isPieStyle = ['pie', 'doughnut'].includes(chartType)
  // Horizontal bars need more width for long formula names
  const isHorizontalBar = chartType === 'horizontalBar'
  // Box plots benefit from more height
  const isBoxPlot = chartType === 'boxplot'
  // Stacked bars with legend need extra width
  const isStackedBar = chartType === 'stackedBar'

  // Optimize dimensions for each chart type
  const width = isPieStyle ? 900 : isHorizontalBar ? 850 : isStackedBar ? 850 : 750
  const height = isBoxPlot ? 550 : isHorizontalBar ? 550 : 500

  const chartBuffer = await generateChartImage(chartData, {
    title: chartTitle,
    width,
    height,
    type: chartType,
  })

  return uploadChartImage(chartBuffer, chartId, 'ai-chart')
}

/**
 * Main function: Extract chart data from PDF, generate charts, and upload them
 * @param pdfContent Text content from PDF
 * @param maxCharts Maximum number of charts to generate (default: 2)
 * @returns Array of generated charts with URLs and metadata
 */
export async function extractGenerateAndUploadCharts(
  pdfContent: string,
  maxCharts: number = 2
): Promise<GeneratedChart[]> {
  console.log('[chart-pipeline] Extracting chart data from PDF...')
  const extractedCharts = await extractChartDataFromPDF(pdfContent, maxCharts)

  if (extractedCharts.length === 0) {
    console.log('[chart-pipeline] No suitable chart data found in PDF')
    return []
  }

  console.log(`[chart-pipeline] Found ${extractedCharts.length} charts to generate`)

  const validCharts = extractedCharts.filter((extractedChart, index) => {
    if (!validateChartData(extractedChart)) {
      console.warn(`[chart-pipeline] Chart ${index + 1} failed validation, skipping`)
      return false
    }
    return true
  })

  const renderableCharts = enforceChartTypeVariety(validCharts)
  const generatedCharts: GeneratedChart[] = []

  for (let i = 0; i < renderableCharts.length; i++) {
    const extractedChart = renderableCharts[i]

    try {
      const chartId = `chart-${i + 1}`
      const placeholder = `https://www.google.com/search?q=%7B%7BFIGURE_${i + 1}_URL%7D%7D`

      console.log(`[chart-pipeline] Generating chart ${i + 1}: ${extractedChart.chartTitle} (${extractedChart.chartType})`)
      const url = await generateAndUploadChart(
        extractedChart.data,
        extractedChart.chartTitle,
        chartId,
        extractedChart.chartType
      )

      generatedCharts.push({
        id: chartId,
        url,
        title: extractedChart.chartTitle,
        alt: `Wykres: ${extractedChart.chartTitle}`,
        caption: `Rysunek ${i + 1}: ${extractedChart.chartTitle}`,
        placeholder,
        sourceDescription: extractedChart.sourceDescription,
      })

      console.log(`[chart-pipeline] Chart ${i + 1} uploaded successfully: ${url}`)
    } catch (error) {
      console.error(`[chart-pipeline] Failed to generate/upload chart ${i + 1}:`, error)
    }
  }

  return generatedCharts
}
