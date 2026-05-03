import OpenAI from 'openai'
import { ChartData, ChartType, BoxPlotDataPoint, SignificanceStatus } from './chart-generator'

export interface ExtractedChartData {
  id?: string
  chartTitle: string
  chartType: ChartType
  data: ChartData
  sourceDescription: string
  axis_min?: number
  axis_max?: number
  significance?: SignificanceStatus[]
  significance_source?: string
  x_axis_label?: string
  y_axis_label?: string
  source_table?: string
}

const BAR_LIKE_CHART_TYPES = new Set<ChartType>(['bar', 'horizontalBar', 'stackedBar'])
const OPENAI_FALLBACK_CHART_EXTRACTION_MODEL = 'gpt-4o'

const CHART_EXTRACTION_RESPONSE_FORMAT = {
  type: 'json_schema',
  name: 'chart_extraction_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['charts'],
    properties: {
      charts: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'chartTitle',
            'chartType',
            'sourceDescription',
            'axis_min',
            'axis_max',
            'significance',
            'significance_source',
            'x_axis_label',
            'y_axis_label',
            'source_table',
            'data',
          ],
          properties: {
            id: { type: 'string' },
            chartTitle: { type: 'string' },
            chartType: {
              type: 'string',
              enum: ['bar', 'line', 'pie', 'doughnut', 'radar', 'stackedBar', 'horizontalBar', 'boxplot'],
            },
            sourceDescription: { type: 'string' },
            axis_min: { type: 'number' },
            axis_max: { type: 'number' },
            significance: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['best', 'sig_worse', 'ns'],
              },
            },
            significance_source: { type: 'string' },
            x_axis_label: { type: 'string' },
            y_axis_label: { type: 'string' },
            source_table: { type: 'string' },
            data: {
              type: 'object',
              additionalProperties: false,
              required: ['labels', 'datasets'],
              properties: {
                labels: {
                  type: 'array',
                  items: { type: 'string' },
                },
                datasets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['label', 'data'],
                    properties: {
                      label: { type: 'string' },
                      data: {
                        type: 'array',
                        items: {
                          anyOf: [
                            { type: 'number' },
                            {
                              type: 'object',
                              additionalProperties: false,
                              required: ['min', 'q1', 'median', 'q3', 'max'],
                              properties: {
                                min: { type: 'number' },
                                q1: { type: 'number' },
                                median: { type: 'number' },
                                q3: { type: 'number' },
                                max: { type: 'number' },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const

function isBarLikeChartType(chartType: ChartType): boolean {
  return BAR_LIKE_CHART_TYPES.has(chartType)
}

function getNumericDatasets(chart: ExtractedChartData): number[][] | null {
  const datasets = chart.data?.datasets || []
  const numericDatasets: number[][] = []

  for (const dataset of datasets) {
    if (!Array.isArray(dataset.data)) return null
    if (dataset.data.some((value) => typeof value !== 'number' || Number.isNaN(value))) {
      return null
    }
    numericDatasets.push(dataset.data as number[])
  }

  return numericDatasets.length > 0 ? numericDatasets : null
}

function canUsePieLikeChart(chart: ExtractedChartData): boolean {
  const datasets = getNumericDatasets(chart)
  if (!datasets || datasets.length !== 1) return false
  const values = datasets[0]
  return values.length >= 2 && values.some((value) => value > 0) && values.every((value) => value >= 0)
}

function canUseRadarChart(chart: ExtractedChartData): boolean {
  const datasets = getNumericDatasets(chart)
  if (!datasets || chart.data.labels.length < 3) return false
  return datasets.every((values) => values.every((value) => value >= 0))
}

function isCompatibleChartType(chart: ExtractedChartData, chartType: ChartType): boolean {
  if (chartType === 'line') return Boolean(getNumericDatasets(chart))
  if (chartType === 'pie' || chartType === 'doughnut') return canUsePieLikeChart(chart)
  if (chartType === 'radar') return canUseRadarChart(chart)
  if (chartType === 'boxplot') {
    return chart.data.datasets.every((dataset) =>
      Array.isArray(dataset.data) && dataset.data.every(isBoxPlotDataPoint)
    )
  }
  return true
}

function pickAlternativeChartType(
  chart: ExtractedChartData,
  blockedTypes: Set<ChartType>,
  blockBarLike: boolean
): ChartType {
  const candidates: ChartType[] = ['line', 'doughnut', 'radar', 'pie', 'boxplot', 'bar']
  const avoidRadar = hasCumulativeIntervalData(chart)
  return (
    candidates.find((candidate) =>
      !blockedTypes.has(candidate) &&
      (!avoidRadar || candidate !== 'radar') &&
      (!blockBarLike || !isBarLikeChartType(candidate)) &&
      isCompatibleChartType(chart, candidate)
    ) || chart.chartType
  )
}

function isOpenAIModelUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase()
  return (
    message.includes('model') &&
    (message.includes('not found') ||
      message.includes('does not exist') ||
      message.includes('not supported') ||
      message.includes('invalid'))
  )
}

function supportsReasoningParameter(model: string): boolean {
  const normalized = model.toLowerCase()
  return normalized.startsWith('gpt-5') || normalized.startsWith('o1') || normalized.startsWith('o3') || normalized.startsWith('o4')
}

function numberAppearsInSource(value: number, normalizedPdf: string): boolean {
  const rawValue = String(value)
  const variants = new Set<string>([rawValue, rawValue.replace('.', ',')])

  if (rawValue.startsWith('0.')) {
    variants.add(rawValue.slice(1))
    variants.add(rawValue.slice(1).replace('.', ','))
  } else if (rawValue.startsWith('-0.')) {
    variants.add(`-${rawValue.slice(2)}`)
    variants.add(`-${rawValue.slice(2).replace('.', ',')}`)
  }

  return Array.from(variants).some((variant) => normalizedPdf.includes(variant))
}

async function extractChartsWithOpenAI(
  openai: OpenAI,
  model: string,
  prompt: string
): Promise<Record<string, any>> {
  console.log(`[chart-extractor] Calling OpenAI chart extraction model: ${model}`)

  const response = await openai.responses.create({
    model,
    instructions:
      'You are a precise medical data extraction assistant. Extract only factual numerical data that appears verbatim in the source document. Return only structured data matching the schema.',
    input: prompt,
    max_output_tokens: 4000,
    text: {
      format: CHART_EXTRACTION_RESPONSE_FORMAT,
    },
    ...(supportsReasoningParameter(model) && {
      reasoning: {
        effort: 'medium',
      },
    }),
  } as any)

  const responseText = response.output_text || '{}'
  try {
    return JSON.parse(responseText)
  } catch (error) {
    console.warn('[chart-extractor] OpenAI returned non-parseable structured output:', responseText.slice(0, 1000))
    throw error
  }
}

async function extractChartsWithModelFallback(
  openai: OpenAI,
  modelName: string,
  prompt: string
): Promise<Record<string, any>> {
  try {
    return await extractChartsWithOpenAI(openai, modelName, prompt)
  } catch (error) {
    if (modelName !== OPENAI_FALLBACK_CHART_EXTRACTION_MODEL && isOpenAIModelUnavailable(error)) {
      console.warn(
        `[chart-extractor] Model "${modelName}" is unavailable for this key; falling back to "${OPENAI_FALLBACK_CHART_EXTRACTION_MODEL}"`
      )
      return extractChartsWithOpenAI(openai, OPENAI_FALLBACK_CHART_EXTRACTION_MODEL, prompt)
    }

    throw error
  }
}

export function enforceChartTypeVariety(charts: ExtractedChartData[]): ExtractedChartData[] {
  const usedTypes = new Set<ChartType>()
  let hasBarLikeChart = false

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i]
    const isDuplicateType = usedTypes.has(chart.chartType)
    const isSecondBarLike = isBarLikeChartType(chart.chartType) && hasBarLikeChart

    if (isDuplicateType || isSecondBarLike) {
      const oldType = chart.chartType
      chart.chartType = pickAlternativeChartType(chart, usedTypes, hasBarLikeChart)
      console.warn(
        `[chart-variety] Changed chart ${i + 1} from '${oldType}' to '${chart.chartType}' to avoid repeated bar-style charts`
      )
    }

    usedTypes.add(chart.chartType)
    if (isBarLikeChartType(chart.chartType)) {
      hasBarLikeChart = true
    }
  }

  return charts
}

function getChartsFromResponse(parsedResponse: any): ExtractedChartData[] {
  const rawCharts = Array.isArray(parsedResponse) ? parsedResponse : (parsedResponse.charts || [])
  return rawCharts.map(normalizeExtractedChart).filter(Boolean) as ExtractedChartData[]
}

function normalizeSignificance(value: unknown, expectedLength: number, chartType: ChartType): SignificanceStatus[] {
  if (!isBarLikeChartType(chartType)) return []
  const raw = Array.isArray(value) ? value : []
  const normalized = raw
    .slice(0, expectedLength)
    .map((status) => (status === 'best' || status === 'sig_worse' || status === 'ns') ? status : 'ns')

  while (normalized.length < expectedLength) {
    normalized.push('ns')
  }

  return normalized
}

function calculateAxisBounds(chart: Pick<ExtractedChartData, 'data'>): { axisMin: number; axisMax: number } | null {
  const datasets = getNumericDatasets(chart as ExtractedChartData)
  if (!datasets) return null

  const values = datasets.flat()
  if (values.length === 0) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const padding = range > 0 ? range * 0.15 : Math.max(Math.abs(max) * 0.15, 0.01)

  return {
    axisMin: Math.floor((min - padding) * 100) / 100,
    axisMax: Math.ceil((max + padding) * 100) / 100,
  }
}

function usesExplicitTruncatedAxis(chart: Pick<ExtractedChartData, 'chartTitle' | 'sourceDescription' | 'data'>): boolean {
  const text = [
    chart.chartTitle,
    chart.sourceDescription,
    chart.data.sourceTable,
  ].join(' ')

  return /\b(truncated|axis\s+truncated|zoomed|magnified|skrocon|skrócon|powieksz|powiększ)\b/i.test(text)
}

function shouldUseZeroBaseline(chart: ExtractedChartData): boolean {
  if (!BAR_LIKE_CHART_TYPES.has(chart.chartType)) return false
  if (usesExplicitTruncatedAxis(chart)) return false

  const values = getNumericDatasets(chart)?.flat() || []
  if (values.length === 0 || values.some((value) => value < 0)) return false

  const text = [
    chart.chartTitle,
    chart.sourceDescription,
    chart.x_axis_label,
    chart.y_axis_label,
    chart.data.datasets.map((dataset) => dataset.label).join(' '),
  ].join(' ')

  return /\b(error|prediction|accuracy|astigmatism|vector|SD|RMSAE|MAE|MedAE|PE|błąd|blad|bledu|błędu|predykcji|dokładność|dokladnosc|wektor|astygmatyzm)\b/i.test(text)
}

function applySafeAxisPolicy(chart: ExtractedChartData): ExtractedChartData {
  if (!shouldUseZeroBaseline(chart)) return chart

  const bounds = calculateAxisBounds(chart)
  const axisMax = chart.data.axisMax ?? chart.axis_max ?? bounds?.axisMax
  chart.axis_min = 0
  chart.data.axisMin = 0
  if (typeof axisMax === 'number') {
    chart.axis_max = axisMax
    chart.data.axisMax = axisMax
  }

  return chart
}

function hasCumulativeIntervalData(chart: Pick<ExtractedChartData, 'chartTitle' | 'sourceDescription' | 'data'>): boolean {
  const text = [
    chart.chartTitle,
    chart.sourceDescription,
    chart.data.labels.join(' '),
    chart.data.datasets.map((dataset) => dataset.label).join(' '),
  ].join(' ').toLowerCase()

  return (
    text.includes('+/-') ||
    text.includes('±') ||
    text.includes('0.25') ||
    text.includes('0,25') ||
    text.includes('0.50') ||
    text.includes('0,50') ||
    text.includes('1.0') ||
    text.includes('1,0') ||
    text.includes('within') ||
    text.includes('granicach') ||
    text.includes('przedzial')
  )
}

function isCumulativeIntervalLineChart(chart: ExtractedChartData): boolean {
  return chart.chartType === 'line' && hasCumulativeIntervalData(chart)
}

function normalizeExtractedChart(rawChart: any): ExtractedChartData | null {
  let chartType = (rawChart.chartType || rawChart.type || 'bar') as ChartType
  const labels = rawChart.data?.labels || rawChart.labels || []
  const datasets = rawChart.data?.datasets || rawChart.datasets || []
  if (!Array.isArray(labels) || !Array.isArray(datasets)) return null

  const data: ChartData = {
    labels,
    datasets,
  }
  const chartTitle = rawChart.chartTitle || rawChart.title || 'Wykres danych'
  const sourceDescription = rawChart.sourceDescription || rawChart.source_table || rawChart.sourceTable || ''
  if (hasCumulativeIntervalData({ chartTitle, sourceDescription, data })) {
    chartType = 'line'
  }

  const normalizedChart: ExtractedChartData = {
    id: rawChart.id,
    chartTitle,
    chartType,
    sourceDescription,
    axis_min: rawChart.axis_min,
    axis_max: rawChart.axis_max,
    significance: rawChart.significance,
    significance_source: rawChart.significance_source,
    x_axis_label: rawChart.x_axis_label,
    y_axis_label: rawChart.y_axis_label,
    source_table: rawChart.source_table,
    data,
  }
  const bounds = calculateAxisBounds(normalizedChart)
  const firstDatasetLength = datasets[0]?.data?.length || labels.length
  const intervalLineBounds = isCumulativeIntervalLineChart(normalizedChart)
    ? (() => {
      const values = getNumericDatasets(normalizedChart)?.flat() || []
      if (values.length === 0) return null
      return {
        axisMin: Math.floor((Math.min(...values) - 5) * 100) / 100,
        axisMax: 100,
      }
    })()
    : null

  data.axisMin = intervalLineBounds?.axisMin ?? (typeof rawChart.axis_min === 'number' ? rawChart.axis_min : bounds?.axisMin)
  data.axisMax = intervalLineBounds?.axisMax ?? (typeof rawChart.axis_max === 'number' ? rawChart.axis_max : bounds?.axisMax)
  data.significance = normalizeSignificance(rawChart.significance, firstDatasetLength, chartType)
  data.significanceSource = rawChart.significance_source || 'not_reported'
  data.xAxisLabel = rawChart.x_axis_label || ''
  data.yAxisLabel = rawChart.y_axis_label || ''
  data.sourceTable = rawChart.source_table || rawChart.sourceDescription || ''

  normalizedChart.axis_min = data.axisMin
  normalizedChart.axis_max = data.axisMax
  normalizedChart.significance = data.significance
  normalizedChart.significance_source = data.significanceSource
  normalizedChart.x_axis_label = data.xAxisLabel
  normalizedChart.y_axis_label = data.yAxisLabel
  normalizedChart.source_table = data.sourceTable

  return applySafeAxisPolicy(normalizedChart)
}

function sanitizeSupportedChartTypes(extractedData: ExtractedChartData[]): ExtractedChartData[] {
  const supportedTypes = new Set<ChartType>(['bar', 'line', 'pie', 'doughnut', 'radar', 'stackedBar', 'horizontalBar', 'boxplot'])

  for (const chart of extractedData) {
    if (!supportedTypes.has(chart.chartType)) {
      console.error(`[chart-extractor] Unsupported chart type '${chart.chartType}' -> forcing to 'bar'`)
      chart.chartType = 'bar'
    }
  }

  return extractedData
}

function hasUsefulVariation(values: number[]): boolean {
  return values.length >= 2 && values.some((value) => value !== values[0])
}

function createCompanionChartFromExisting(chart: ExtractedChartData): ExtractedChartData | null {
  const labels = chart.data?.labels || []
  const numericDatasets = getNumericDatasets(chart)
  if (!numericDatasets || labels.length < 2) return null

  const datasets = chart.data.datasets
    .map((dataset, index) => ({
      label: dataset.label,
      data: numericDatasets[index],
    }))
    .filter((dataset) => dataset.data.length === labels.length && hasUsefulVariation(dataset.data))

  if (datasets.length === 0) return null

  const companionType: ChartType = isCumulativeIntervalLineChart(chart)
    ? 'line'
    : isBarLikeChartType(chart.chartType)
    ? 'line'
    : labels.length >= 7
      ? 'horizontalBar'
      : 'bar'

  return {
    chartTitle: `${chart.chartTitle} - ujęcie alternatywne`,
    chartType: companionType,
    sourceDescription: `${chart.sourceDescription}; alternatywna wizualizacja zweryfikowanych danych`,
    axis_min: chart.axis_min,
    axis_max: chart.axis_max,
    significance: isBarLikeChartType(companionType) ? normalizeSignificance(chart.significance, labels.length, companionType) : [],
    significance_source: chart.significance_source || 'not_reported',
    x_axis_label: chart.x_axis_label,
    y_axis_label: chart.y_axis_label,
    source_table: chart.source_table,
    data: {
      labels: [...labels],
      axisMin: chart.data.axisMin,
      axisMax: chart.data.axisMax,
      significance: isBarLikeChartType(companionType) ? normalizeSignificance(chart.data.significance, labels.length, companionType) : [],
      significanceSource: chart.data.significanceSource || 'not_reported',
      xAxisLabel: chart.data.xAxisLabel,
      yAxisLabel: chart.data.yAxisLabel,
      sourceTable: chart.data.sourceTable,
      datasets: datasets.map((dataset) => ({
        label: dataset.label,
        data: [...dataset.data],
      })),
    },
  }
}

function ensureRequestedChartCount(charts: ExtractedChartData[], maxCharts: number): ExtractedChartData[] {
  const completedCharts = enforceChartTypeVariety([...charts])

  while (completedCharts.length < maxCharts && completedCharts.length > 0) {
    const sourceChart = completedCharts[completedCharts.length - 1]
    const companionChart = createCompanionChartFromExisting(sourceChart)
    if (!companionChart) break

    completedCharts.push(companionChart)
    enforceChartTypeVariety(completedCharts)
    console.warn(
      `[chart-extractor] OpenAI returned only ${completedCharts.length - 1} chart(s); added a '${companionChart.chartType}' companion chart from verified source data`
    )
  }

  return completedCharts.slice(0, maxCharts)
}

interface ParsedTableRow {
  label: string
  values: number[]
}

interface ParsedTableGroup {
  caption: string
  rows: ParsedTableRow[]
  rawLines: string[]
}

function parseNumericHelperValue(value: string): number | null {
  const normalized = value.trim().replace(',', '.').replace(/[<>*=]/g, '')
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function cleanParsedRowLabel(label: string): string {
  return label
    .replace(/[|:[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalFormulaLabel(label: string): string | null {
  const cleaned = cleanParsedRowLabel(label).replace(/^[a-z](?:\s+[a-z]){1,8}\s+/i, '')
  if (/\bCooke(?:\s*K6)?\b/i.test(cleaned)) return 'Cooke K6'
  if (/\bPearl(?:-DGS|-)?\b/i.test(cleaned)) return 'Pearl-DGS'
  if (/\bEVO\b/i.test(cleaned)) return 'EVO'
  if (/\bBarrett\b/i.test(cleaned)) return 'Barrett'
  if (/\bHill(?:-RBF)?\b/i.test(cleaned)) return 'Hill-RBF'
  if (/\bKane\b/i.test(cleaned)) return 'Kane'
  if (/\bHoffer(?:\s*QST)?\b/i.test(cleaned)) return 'Hoffer QST'
  return null
}

function parseLayoutTableRow(line: string): ParsedTableRow | null {
  const normalized = line.replace(/\u0001/g, '-').replace(/\s+/g, ' ').trim()
  if (/^\[PARSED TABLE ROW:/i.test(normalized)) return null
  const numericMatches = Array.from(normalized.matchAll(/[-+]?\d+(?:[.,]\d+)?/g))
  if (numericMatches.length < 3) return null

  const formulaMatch = normalized.match(/\b(Cooke(?:\s*K6)?|Pearl(?:-DGS|-)?|EVO|Barrett|Hill(?:-RBF)?|Kane|Hoffer(?:\s*QST)?)\b/i)
  const firstNumeric = formulaMatch
    ? numericMatches.find((match) => typeof match.index === 'number' && match.index > (formulaMatch.index || 0) + formulaMatch[0].length)
    : numericMatches[0]
  if (!firstNumeric || typeof firstNumeric.index !== 'number' || firstNumeric.index < 2) return null

  const label = formulaMatch
    ? canonicalFormulaLabel(formulaMatch[0]) || cleanParsedRowLabel(formulaMatch[0])
    : cleanParsedRowLabel(normalized.slice(0, firstNumeric.index))
  if (!/[A-Za-z]/.test(label) || label.length < 2 || label.length > 48) return null
  if (/^(table|tabela|formula|mean|median|mad|sd|rmsae|pe)\b/i.test(label)) return null

  const values = numericMatches
    .filter((match) => typeof match.index === 'number' && match.index >= firstNumeric.index!)
    .map((match) => parseNumericHelperValue(match[0]))
    .filter((value): value is number => typeof value === 'number')

  if (values.length < 3) return null
  return { label, values }
}

function isFormulaComparisonLabel(label: string): boolean {
  return Boolean(canonicalFormulaLabel(label))
}

function normalizeFormulaLabel(label: string): string {
  return (canonicalFormulaLabel(label) || label).toLowerCase()
}

function extractParsedTableGroups(pdfContent: string): ParsedTableGroup[] {
  const groups: ParsedTableGroup[] = []
  let current: ParsedTableGroup | null = null
  let skipCurrent = false

  for (const rawLine of pdfContent.split('\n')) {
    const line = rawLine.trim()
    const tableMatch = line.match(/^\[TABLE:\s*(.+?)\]$/i)
    if (tableMatch) {
      current = { caption: tableMatch[1]?.trim() || 'Tabela wynikow', rows: [], rawLines: [] }
      groups.push(current)
      skipCurrent = /(?:p\s*-?\s*values?|adjusted\s*p\s*values?|adjustedpvalues|significance|pairwise)/i.test(current.caption)
      continue
    }

    if (/^\[END TABLE\]/i.test(line)) {
      current = null
      skipCurrent = false
      continue
    }

    if (!current || skipCurrent) continue

    current.rawLines.push(line)

    const layoutRow = parseLayoutTableRow(line)
    const rowMatch = line.match(/^\[PARSED TABLE ROW:\s*(.+?)\s*\|\s*values in source order:\s*(.+?)\]$/i)
    const helperRow = rowMatch
      ? {
        label: cleanParsedRowLabel(rowMatch[1] || ''),
        values: (rowMatch[2] || '')
          .split('|')
          .map(parseNumericHelperValue)
          .filter((value): value is number => typeof value === 'number'),
      }
      : null
    const parsedRow = layoutRow || helperRow

    if (parsedRow && parsedRow.label.length >= 2 && parsedRow.values.length >= 3) {
      const canonicalLabel = canonicalFormulaLabel(parsedRow.label)
      current.rows.push({
        ...parsedRow,
        label: canonicalLabel || parsedRow.label,
      })
    }
  }

  return groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row, index, rows) =>
        rows.findIndex((candidate) => normalizeFormulaLabel(candidate.label) === normalizeFormulaLabel(row.label)) === index
      ),
    }))
    .filter((group) => group.rows.length >= 3 || extractFormulaHeaderLabels(group.rawLines).length >= 3)
}

function mostCommonValueLength(rows: ParsedTableRow[]): number {
  const counts = new Map<number, number>()
  for (const row of rows) {
    counts.set(row.values.length, (counts.get(row.values.length) || 0) + 1)
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0
}

function chooseBestParsedTable(groups: ParsedTableGroup[]): ParsedTableGroup | null {
  const candidates = groups
    .map((group) => {
      const commonLength = mostCommonValueLength(group.rows)
      const rows = group.rows.filter((row) => row.values.length >= Math.max(3, commonLength))
      const formulaRows = rows.filter((row) => isFormulaComparisonLabel(row.label)).length
      const score =
        rows.length * 10 +
        formulaRows * 50 +
        (/\b(ESCRS|formula|formulas|whole|overall|primary|dataset|results?|comparison|porown|wynik)/i.test(group.caption) ? 20 : 0) +
        (/\bwhole dataset\b/i.test(group.caption) ? 250 : 0) +
        (/\b(short|long)\s+eyes\b|[<>]\s*\d+\s*mm/i.test(group.caption) ? -120 : 0) +
        (rows.some((row) => row.values.slice(1, 5).filter((value) => value > 1 && value <= 100).length >= 3) ? 5 : 0)
      return { group: { ...group, rows }, score }
    })
    .filter((candidate) => candidate.group.rows.length >= 3 && candidate.group.rows.filter((row) => isFormulaComparisonLabel(row.label)).length >= 3)

  return candidates.sort((a, b) => b.score - a.score)[0]?.group || null
}

function normalizeColumnFormulaLabel(label: string): string {
  const cleaned = label.replace(/\s+/g, ' ').trim()
  if (/^EVO\s+P$/i.test(cleaned)) return 'EVO P'
  if (/^EVO\s+M$/i.test(cleaned)) return 'EVO M'
  if (/^Barrett\s+P$/i.test(cleaned)) return 'Barrett P'
  if (/^Barrett\s+M$/i.test(cleaned)) return 'Barrett M'
  if (/^Hoffer/i.test(cleaned)) return 'Hoffer QST'
  if (/^Kane$/i.test(cleaned)) return 'Kane'
  return cleaned
}

function extractFormulaHeaderLabels(lines: string[]): string[] {
  for (const line of lines) {
    const labels = Array.from(line.matchAll(/\b(Kane|EVO\s+[PM]|Barrett\s+[PM]|Hoffer(?:®|\s*)\s*QST)\b/gi))
      .map((match) => normalizeColumnFormulaLabel(match[1] || match[0]))

    if (labels.length >= 3) return labels
  }

  return []
}

function numbersFromLine(line: string): number[] {
  return Array.from(line.matchAll(/[-+]?\d+(?:[.,]\d+)?/g))
    .map((match) => parseNumericHelperValue(match[0]))
    .filter((value): value is number => typeof value === 'number')
}

function buildToricMeanVectorChart(group: ParsedTableGroup): ExtractedChartData | null {
  if (!/\bmean\s+vector\s+magnitude\b|\bastigmatism\s+prediction\s+error\b/i.test(group.caption)) return null

  const labels = extractFormulaHeaderLabels(group.rawLines)
  if (labels.length < 3) return null

  const allIndex = group.rawLines.findIndex((line) => /^All\b/i.test(line))
  const searchLines = allIndex >= 0 ? group.rawLines.slice(allIndex + 1) : group.rawLines
  const meanLine = searchLines.find((line) => /^Mean\b/i.test(line) && !/^\[PARSED TABLE ROW:/i.test(line))
  if (!meanLine) return null

  const values = numbersFromLine(meanLine).slice(0, labels.length)
  if (values.length !== labels.length || !hasUsefulVariation(values)) return null

  const data = makeChartData(
    labels,
    'Średni błąd wektorowy (D)',
    values,
    group.caption,
    'Formuła toryczna',
    'Średni błąd wektorowy (D)'
  )

  return {
    id: 'parsed_toric_mean_vector_error',
    chartTitle: 'Średni wektorowy błąd predykcji astygmatyzmu',
    chartType: 'horizontalBar',
    sourceDescription: 'Porównanie średniego wektorowego błędu predykcji astygmatyzmu dla formuł torycznych. Niższa wartość oznacza większą dokładność.',
    axis_min: data.axisMin,
    axis_max: data.axisMax,
    significance: [],
    significance_source: 'not_reported',
    x_axis_label: data.xAxisLabel,
    y_axis_label: data.yAxisLabel,
    source_table: group.caption,
    data,
  }
}

function extractThresholdValues(line: string, formulaCount: number): { labels: string[]; values: number[][] } | null {
  const thresholdLabels = ['≤0,50 D', '≤0,75 D', '≤1,00 D']
  const markers = Array.from(line.matchAll(/(?:≤|<=)?\s*(?:0[.,]50|0[.,]75|1[.,]00)\s*D/gi))
  if (markers.length < 3) return null

  const values = markers.slice(0, 3).map((marker, index) => {
    const start = (marker.index || 0) + marker[0].length
    const end = index + 1 < markers.length ? markers[index + 1].index || line.length : line.length
    return numbersFromLine(line.slice(start, end)).slice(0, formulaCount)
  })

  if (values.some((row) => row.length !== formulaCount)) return null
  return { labels: thresholdLabels, values }
}

function buildToricThresholdChart(group: ParsedTableGroup): ExtractedChartData | null {
  if (!/\bproportion\s+of\s+eyes\b|\bvector\s+prediction\s+error\b/i.test(group.caption)) return null

  const formulaLabels = extractFormulaHeaderLabels(group.rawLines)
  if (formulaLabels.length < 3) return null

  const allLine = group.rawLines
    .map((line, index, lines) => [line, lines[index + 1], lines[index + 2]].filter(Boolean).join(' '))
    .find((line) =>
      /\bAll\b/i.test(line) &&
      /(?:≤|<=)?\s*0[.,]50\s*D/i.test(line) &&
      !/^\[PARSED TABLE ROW:/i.test(line)
    )
  if (!allLine) return null

  const parsed = extractThresholdValues(allLine, formulaLabels.length)
  if (!parsed) return null

  const datasets = formulaLabels.map((formula, formulaIndex) => ({
    label: formula,
    data: parsed.values.map((thresholdValues) => thresholdValues[formulaIndex]),
  }))

  const allValues = datasets.flatMap((dataset) => dataset.data)
  if (!hasUsefulVariation(allValues)) return null

  const axisMin = Math.max(0, Math.floor((Math.min(...allValues) - 5) * 100) / 100)

  return {
    id: 'parsed_toric_error_thresholds',
    chartTitle: 'Odsetek oczu z błędem wektorowym w zadanych progach',
    chartType: 'line',
    sourceDescription: 'Odsetek oczu z wektorowym błędem predykcji nieprzekraczającym 0,50 D, 0,75 D i 1,00 D dla poszczególnych formuł. Próg 0,50 D jest pierwszorzędowym punktem końcowym w analizowanym źródle.',
    axis_min: axisMin,
    axis_max: 100,
    significance: [],
    significance_source: 'not_reported',
    x_axis_label: 'Próg błędu wektorowego',
    y_axis_label: 'Odsetek oczu (%)',
    source_table: group.caption,
    data: {
      labels: parsed.labels,
      datasets,
      axisMin,
      axisMax: 100,
      significance: [],
      significanceSource: 'not_reported',
      xAxisLabel: 'Próg błędu wektorowego',
      yAxisLabel: 'Odsetek oczu (%)',
      sourceTable: group.caption,
    },
  }
}

function buildColumnHeaderOutcomeCharts(groups: ParsedTableGroup[], maxCharts: number): ExtractedChartData[] {
  const candidates: ExtractedChartData[] = []

  for (const group of groups) {
    const meanChart = buildToricMeanVectorChart(group)
    const thresholdChart = buildToricThresholdChart(group)
    if (meanChart) candidates.push(meanChart)
    if (thresholdChart) candidates.push(thresholdChart)
  }

  return enforceChartTypeVariety(candidates).slice(0, maxCharts)
}

function chooseBestGenericParsedTable(groups: ParsedTableGroup[]): ParsedTableGroup | null {
  const candidates = groups
    .map((group) => {
      const rows = genericRows(group)
        .filter((row) => row.values.length >= 2)
        .slice(0, 8)

      const score =
        rows.length * 10 +
        (/\b(reliability|validity|responsiveness|fit indices|CFA|mean|scores?|metrics?)\b/i.test(group.caption) ? 70 : 0) +
        (/\b(domain|item composition|questionnaire)\b/i.test(group.caption) ? -30 : 0) +
        (rows.some((row) => row.values.some((value) => value > 0 && value <= 1)) ? 10 : 0)

      return { group: { ...group, rows }, score }
    })
    .filter((candidate) => candidate.group.rows.length >= 3)

  return candidates.sort((a, b) => b.score - a.score)[0]?.group || null
}

function isUsableGenericLabel(label: string): boolean {
  return (
    label.length >= 3 &&
    label.length <= 56 &&
    !isFormulaComparisonLabel(label) &&
    !/^(https?|clinical ophthalmology|powered by|discussion|table|figure)\b/i.test(label) &&
    !/[=;]|(?:\bsubsample\b|\bexample\b|\bobserved\b|\bbetween\b|\bavailable\b|\bindicated\b|\bsignificant\b)/i.test(label)
  )
}

function genericRows(group: ParsedTableGroup): ParsedTableRow[] {
  return group.rows.filter((row) => isUsableGenericLabel(row.label) && row.values.length >= 1).slice(0, 10)
}

function isTemporalLabel(label: string): boolean {
  return /\b(T\d+|baseline|trimester|postpartum|week|weeks|month|months|day|days|follow-up|follow up)\b/i.test(label)
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function approximately(value: number, target: number, tolerance: number): boolean {
  return Math.abs(value - target) <= tolerance
}

function chartFamilyRank(chart: ExtractedChartData): number {
  if (chart.chartType === 'line') return 4
  if (chart.chartType === 'doughnut' || chart.chartType === 'pie') return 3
  if (chart.chartType === 'radar') return 2
  return 1
}

function chooseMetricColumn(rows: ParsedTableRow[], excludedColumns: Set<number> = new Set()): number | null {
  const maxColumns = Math.max(...rows.map((row) => row.values.length), 0)
  const candidates: { index: number; score: number }[] = []

  for (let index = 0; index < maxColumns; index++) {
    if (excludedColumns.has(index)) continue
    const values = rows.map((row) => row.values[index]).filter((value): value is number => typeof value === 'number')
    if (values.length < Math.max(3, Math.ceil(rows.length * 0.75))) continue
    if (!hasUsefulVariation(values)) continue

    const range = Math.max(...values) - Math.min(...values)
    const inUnitInterval = values.filter((value) => value >= 0 && value <= 1).length
    const nonInteger = values.filter((value) => !Number.isInteger(value)).length
    const repeatedLarge = values.filter((value) => value >= 100).length
    const score = inUnitInterval * 6 + nonInteger * 3 + range - repeatedLarge * 6 - index
    candidates.push({ index, score })
  }

  return candidates.sort((a, b) => b.score - a.score)[0]?.index ?? null
}

function inferGenericMetricLabel(caption: string, columnIndex: number): string {
  if (/\breliability\b/i.test(caption)) {
    if (columnIndex === 0) return 'Cronbach alpha'
    if (columnIndex === 1) return 'ICC'
  }
  if (/\bCFA|fit indices\b/i.test(caption)) return columnIndex === 0 ? 'Wartosc indeksu' : `Metryka ${columnIndex + 1}`
  if (/\bmean|scores?\b/i.test(caption)) return 'Wynik sredni'
  if (/\bresponsiveness\b/i.test(caption)) return columnIndex === 0 ? 'Zmiana srednia' : `Metryka ${columnIndex + 1}`
  return `Metryka ${columnIndex + 1}`
}

function buildGenericMetricChart(
  group: ParsedTableGroup,
  columnIndex: number,
  chartIndex: number,
  preferredType?: ChartType
): ExtractedChartData | null {
  const rows = group.rows
    .map((row) => ({ label: row.label, value: row.values[columnIndex] }))
    .filter((row): row is { label: string; value: number } => typeof row.value === 'number')

  if (rows.length < 3 || !hasUsefulVariation(rows.map((row) => row.value))) return null

  const labels = rows.map((row) => row.label)
  const values = rows.map((row) => row.value)
  const metricLabel = inferGenericMetricLabel(group.caption, columnIndex)
  const chartType: ChartType = preferredType || (chartIndex === 0 ? (labels.length >= 7 ? 'horizontalBar' : 'bar') : 'line')
  const data = makeChartData(labels, metricLabel, values, group.caption, 'Kategoria', metricLabel)
  data.significance = []

  return {
    id: `parsed_generic_metric_${columnIndex + 1}`,
    chartTitle: metricLabel,
    chartType,
    sourceDescription: `${metricLabel} wedlug kategorii w analizowanym dokumencie`,
    axis_min: data.axisMin,
    axis_max: data.axisMax,
    significance: [],
    significance_source: 'not_reported',
    x_axis_label: data.xAxisLabel,
    y_axis_label: data.yAxisLabel,
    source_table: group.caption,
    data,
  }
}

function buildTemporalChart(group: ParsedTableGroup): ExtractedChartData | null {
  const rows = genericRows(group).filter((row) => isTemporalLabel(row.label) && row.values.length >= 2)
  if (rows.length < 3) return null

  const metricColumn = chooseMetricColumn(rows)
  if (metricColumn === null) return null
  const values = rows.map((row) => row.values[metricColumn]).filter((value): value is number => typeof value === 'number')
  if (values.length !== rows.length || !hasUsefulVariation(values)) return null

  const chart = buildGenericMetricChart({ ...group, rows }, metricColumn, 0, 'line')
  if (!chart) return null

  chart.id = 'parsed_temporal_metric'
  chart.chartTitle = 'Zmiana wyniku w czasie'
  chart.sourceDescription = 'Trend wartosci liczbowej w kolejnych punktach czasowych'
  chart.data.labels = rows.map((row) => row.label)
  chart.data.datasets = [{ label: chart.data.datasets[0]?.label || 'Wartosc', data: values }]
  chart.data.xAxisLabel = 'Punkt czasowy'
  chart.x_axis_label = 'Punkt czasowy'
  return chart
}

function buildProportionChart(group: ParsedTableGroup): ExtractedChartData | null {
  const rows = genericRows(group).filter((row) => row.values.length >= 1)
  if (rows.length < 2 || rows.length > 8) return null

  const column = chooseMetricColumn(rows)
  if (column === null) return null
  const labels = rows.map((row) => row.label)
  const values = rows.map((row) => row.values[column]).filter((value): value is number => typeof value === 'number')
  if (values.length !== labels.length || values.some((value) => value < 0) || !hasUsefulVariation(values)) return null

  const total = sum(values)
  const captionSuggestsComposition = /\b(distribution|composition|proportion|percent|percentage|stratified|sex|gender|SES|group)\b/i.test(group.caption)
  if (!captionSuggestsComposition && !approximately(total, 100, 5)) return null

  return {
    id: 'parsed_proportion',
    chartTitle: 'Rozklad kategorii',
    chartType: 'doughnut',
    sourceDescription: 'Rozklad wartosci liczbowych wedlug kategorii',
    significance: [],
    significance_source: 'not_reported',
    x_axis_label: 'Kategoria',
    y_axis_label: 'Wartosc',
    source_table: group.caption,
    data: {
      labels,
      datasets: [{ label: inferGenericMetricLabel(group.caption, column), data: values }],
      significance: [],
      significanceSource: 'not_reported',
      xAxisLabel: 'Kategoria',
      yAxisLabel: 'Wartosc',
      sourceTable: group.caption,
    },
  }
}

function buildRadarChart(group: ParsedTableGroup): ExtractedChartData | null {
  const rows = genericRows(group).filter((row) => row.values.length >= 3)
  if (rows.length < 3 || rows.length > 8) return null

  const maxColumns = Math.min(4, mostCommonValueLength(rows))
  if (maxColumns < 3) return null

  const datasets = Array.from({ length: maxColumns }, (_, index) => {
    const data = rows.map((row) => row.values[index]).filter((value): value is number => typeof value === 'number')
    return data.length === rows.length && hasUsefulVariation(data)
      ? { label: inferGenericMetricLabel(group.caption, index), data }
      : null
  }).filter(Boolean) as { label: string; data: number[] }[]

  if (datasets.length < 2) return null

  return {
    id: 'parsed_multi_metric',
    chartTitle: 'Porownanie wielu metryk',
    chartType: 'radar',
    sourceDescription: 'Porownanie kilku metryk liczbowych pomiedzy kategoriami',
    significance: [],
    significance_source: 'not_reported',
    x_axis_label: 'Kategoria',
    y_axis_label: 'Wartosc',
    source_table: group.caption,
    data: {
      labels: rows.map((row) => row.label),
      datasets,
      significance: [],
      significanceSource: 'not_reported',
      xAxisLabel: 'Kategoria',
      yAxisLabel: 'Wartosc',
      sourceTable: group.caption,
    },
  }
}

function buildGenericCharts(groups: ParsedTableGroup[], maxCharts: number): ExtractedChartData[] {
  const candidates: Array<ExtractedChartData | null> = []

  for (const group of groups) {
    const rows = genericRows(group)
    if (rows.length < 2) continue

    const firstColumn = chooseMetricColumn(rows)
    const secondColumn = firstColumn === null ? null : chooseMetricColumn(rows, new Set([firstColumn]))

    candidates.push(
      buildTemporalChart(group),
      buildProportionChart(group),
      firstColumn === null ? null : buildGenericMetricChart({ ...group, rows }, firstColumn, 0),
      secondColumn === null ? null : buildGenericMetricChart({ ...group, rows }, secondColumn, 1),
      buildRadarChart(group)
    )
  }

  const seen = new Set<string>()
  const unique = candidates
    .filter((chart): chart is ExtractedChartData => Boolean(chart))
    .filter((chart) => {
      const key = `${chart.chartTitle}:${chart.chartType}:${chart.data.labels.join('|')}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return unique.slice(0, maxCharts)
}

function inferPrimaryMetricLabel(caption: string): string {
  if (/\bRMSAE\b/i.test(caption)) return 'RMSAE'
  if (/\bMAE\b/i.test(caption)) return 'MAE'
  if (/\bSD\b/i.test(caption)) return 'SD'
  return 'SD błędu predykcji (D)'
}

function makeChartData(
  labels: string[],
  label: string,
  data: number[],
  sourceTable: string,
  xAxisLabel: string,
  yAxisLabel: string
): ChartData {
  const bounds = calculateAxisBounds({
    data: {
      labels,
      datasets: [{ label, data }],
    },
  } as ExtractedChartData)

  return {
    labels,
    datasets: [{ label, data }],
    axisMin: bounds?.axisMin,
    axisMax: bounds?.axisMax,
    significance: [],
    significanceSource: 'not_reported',
    xAxisLabel,
    yAxisLabel,
    sourceTable,
  }
}

function buildPrimaryMetricChart(group: ParsedTableGroup): ExtractedChartData | null {
  const rows = group.rows.filter((row) => Number.isFinite(row.values[0]))
  if (rows.length < 3) return null

  const labels = rows.map((row) => row.label)
  const values = rows.map((row) => row.values[0]!)
  if (!hasUsefulVariation(values)) return null

  const metricLabel = inferPrimaryMetricLabel(group.caption)
  const chartType: ChartType = labels.length >= 7 ? 'horizontalBar' : 'bar'
  const data = makeChartData(labels, metricLabel, values, group.caption, 'Formuła IOL', metricLabel)

  return {
    id: 'parsed_primary_metric',
    chartTitle: `Porównanie SD błędu predykcji według formuły`,
    chartType,
    sourceDescription: `Porównanie odchylenia standardowego błędu predykcji w analizowanej kohorcie. Niższa wartość SD oznacza większą precyzję.`,
    axis_min: data.axisMin,
    axis_max: data.axisMax,
    significance: data.significance,
    significance_source: data.significanceSource,
    x_axis_label: data.xAxisLabel,
    y_axis_label: data.yAxisLabel,
    source_table: group.caption,
    data,
  }
}

function buildCumulativePercentageChart(group: ParsedTableGroup): ExtractedChartData | null {
  const rows = group.rows
    .map((row) => ({ label: row.label, values: row.values.slice(1, 5) }))
    .filter((row) => row.values.length === 4 && row.values.every((value) => value > 0 && value <= 100))

  if (rows.length < 3) return null

  const hasVariation = rows.some((row) => hasUsefulVariation(row.values))
  if (!hasVariation) return null

  const allValues = rows.flatMap((row) => row.values)
  const axisMin = Math.max(0, Math.floor((Math.min(...allValues) - 5) * 100) / 100)
  const data: ChartData = {
    labels: ['±0,25', '±0,50', '±0,75', '±1,00'],
    datasets: rows.map((row) => ({
      label: row.label,
      data: row.values,
    })),
    axisMin,
    axisMax: 100,
    significance: [],
    significanceSource: 'not_reported',
    xAxisLabel: 'Przedział błędu predykcji',
    yAxisLabel: 'Odsetek (%)',
    sourceTable: group.caption,
  }

  return {
    id: 'parsed_cumulative_intervals',
    chartTitle: `Odsetek oczu w przedziałach błędu predykcji`,
    chartType: 'line',
    sourceDescription: `Odsetek oczu mieszczących się w kolejnych przedziałach błędu predykcji dla poszczególnych formuł.`,
    axis_min: axisMin,
    axis_max: 100,
    significance: [],
    significance_source: 'not_reported',
    x_axis_label: data.xAxisLabel,
    y_axis_label: data.yAxisLabel,
    source_table: group.caption,
    data,
  }
}

function extractDeterministicChartsFromParsedRows(pdfContent: string, maxCharts: number): ExtractedChartData[] {
  const groups = extractParsedTableGroups(pdfContent)
  const columnHeaderCharts = buildColumnHeaderOutcomeCharts(groups, maxCharts)
  const verifiedColumnHeaderCharts = columnHeaderCharts
    .map(applySafeAxisPolicy)
    .filter((chart) => validateChartData(chart) && verifyChartDataAgainstSource(chart, pdfContent))
  if (verifiedColumnHeaderCharts.length > 0) {
    console.warn(`[chart-extractor] Built ${verifiedColumnHeaderCharts.length} deterministic chart(s) from column-header outcome tables`)
    return verifiedColumnHeaderCharts.slice(0, maxCharts)
  }

  const bestFormulaGroup = chooseBestParsedTable(groups)
  const charts = bestFormulaGroup
    ? [
      buildPrimaryMetricChart(bestFormulaGroup),
      buildCumulativePercentageChart(bestFormulaGroup),
    ].filter(Boolean) as ExtractedChartData[]
    : (() => {
      const genericCharts = buildGenericCharts(groups, maxCharts)
      if (genericCharts.length > 0) return genericCharts

      const bestGenericGroup = chooseBestGenericParsedTable(groups)
      if (!bestGenericGroup) return []
      const firstColumn = chooseMetricColumn(bestGenericGroup.rows)
      if (firstColumn === null) return []
      return [buildGenericMetricChart(bestGenericGroup, firstColumn, 0)].filter(Boolean) as ExtractedChartData[]
    })()

  const verifiedCharts = [...verifiedColumnHeaderCharts, ...charts.map(applySafeAxisPolicy)]
    .filter((chart) => validateChartData(chart) && verifyChartDataAgainstSource(chart, pdfContent))
  if (verifiedCharts.length > 0) {
    console.warn(`[chart-extractor] Built ${verifiedCharts.length} deterministic chart(s) from parsed PDF table rows`)
  }

  return enforceChartTypeVariety(verifiedCharts).slice(0, maxCharts)
}

function extractTableBlocks(pdfContent: string): string[] {
  const blocks: string[] = []
  let current: string[] = []
  let inTable = false

  for (const rawLine of pdfContent.split('\n')) {
    const line = rawLine.trimEnd()
    if (/^\[TABLE:/i.test(line.trim())) {
      if (current.length > 0) blocks.push(current.join('\n'))
      current = [line]
      inTable = true
      continue
    }

    if (inTable) {
      current.push(line)
      if (/^\[END TABLE\]/i.test(line.trim())) {
        blocks.push(current.join('\n'))
        current = []
        inTable = false
      }
    }
  }

  if (current.length > 0) blocks.push(current.join('\n'))
  return blocks
}

function buildChartFocusedContext(pdfContent: string, maxChars: number = 26000): string {
  const tableBlocks = extractTableBlocks(pdfContent)
  const scoredBlocks = tableBlocks
    .map((block) => {
      const parsedRows = (block.match(/\[PARSED TABLE ROW:/g) || []).length
      const numericCount = (block.match(/[-+]?\d+(?:[.,]\d+)?/g) || []).length
      const isPValueOnly = /(?:p\s*-?\s*values?|adjusted\s*p\s*values?|adjustedpvalues|pairwise)/i.test(block)
      const isPrimary = /\b(whole|overall|primary|dataset|n\s*=|comparison|results?|formula|RMSAE|MAE|SD)\b/i.test(block)
      const score = parsedRows * 20 + numericCount + (isPrimary ? 40 : 0) - (isPValueOnly ? 60 : 0)
      return { block, score }
    })
    .sort((a, b) => b.score - a.score)

  const selected: string[] = []
  let usedChars = 0
  for (const { block } of scoredBlocks) {
    if (usedChars + block.length > maxChars && selected.length > 0) continue
    selected.push(block)
    usedChars += block.length
    if (usedChars >= maxChars) break
  }

  const intro = pdfContent
    .split('\n')
    .filter((line) => /\b(abstract|results?|conclusion|primary endpoint|main outcome|RMSAE|MAE|SD)\b/i.test(line))
    .slice(0, 30)
    .join('\n')

  const context = [
    'CHART-FOCUSED SOURCE CONTEXT',
    'The following content preserves table captions, original flattened rows, and parsed-row helpers for chart extraction.',
    intro ? `\nKey non-table result lines:\n${intro}` : '',
    `\nTable/result blocks:\n${selected.join('\n\n')}`,
  ].filter(Boolean).join('\n')

  return context.slice(0, maxChars)
}

function buildSupplementalChartPrompt(
  pdfContent: string,
  existingCharts: ExtractedChartData[],
  neededCharts: number
): string {
  const existingSummary = existingCharts.map((chart, index) =>
    `Chart ${index + 1}: "${chart.chartTitle}" (${chart.chartType}) from ${chart.sourceDescription}`
  ).join('\n')
  const hasBarLikeChart = existingCharts.some((chart) => isBarLikeChartType(chart.chartType))

  return `Analyze the same medical/scientific document and extract exactly ${neededCharts} ADDITIONAL chart(s).

Existing chart(s) already selected:
${existingSummary || 'None'}

Rules:
- Do NOT repeat the same endpoint, title, labels, or source table already listed above.
- Every number must appear verbatim in the document.
- Return only clinically relevant numerical data.
- If an existing chart is bar-family, the new chart MUST NOT be bar, horizontalBar, or stackedBar.
- If there is no existing bar-family chart, still choose a visually different type from existing chart types.
- Allowed chart types: bar, horizontalBar, stackedBar, boxplot, line, pie, doughnut, radar.
- Do not use scatter or polarArea.
- If no truly additional numerical data exists, return {"charts": []}.
${hasBarLikeChart ? '- Because a bar-family chart already exists, prefer line, doughnut, pie, radar, or boxplot.' : ''}

Return ONLY a valid JSON object with this structure:
{
  "charts": [
    {
      "id": "short_snake_case_identifier",
      "chartTitle": "Polish title",
      "chartType": "line",
      "axis_min": 0.00,
      "axis_max": 1.00,
      "significance": [],
      "significance_source": "not_reported",
      "x_axis_label": "X-axis label",
      "y_axis_label": "Y-axis label",
      "source_table": "Table or figure number",
      "sourceDescription": "Source table/result in Polish",
      "data": {
        "labels": ["Label 1", "Label 2"],
        "datasets": [
          { "label": "Metric", "data": [1, 2] }
        ]
      }
    }
  ]
}

Document content:
${pdfContent}`
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
  console.log(`[chart-extractor] extractChartDataFromPDF called, pdfContent length: ${pdfContent?.length}, maxCharts: ${maxCharts}`)
  const deterministicCharts = extractDeterministicChartsFromParsedRows(pdfContent, maxCharts)
  if (deterministicCharts.length >= maxCharts) {
    console.log(`[chart-extractor] Using ${deterministicCharts.length} verified deterministic chart(s); skipping OpenAI chart extraction`)
    return deterministicCharts
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[chart-extractor] OPENAI_API_KEY is not configured, using deterministic parsed-table charts only')
    return deterministicCharts
  }
  console.log('[chart-extractor] OPENAI_API_KEY present, proceeding with extraction...')

  const openai = new OpenAI({ apiKey })
  const modelName = process.env.OPENAI_CHART_EXTRACTION_MODEL || 'gpt-5.4'
  const tableTagCount = (pdfContent.match(/\[TABLE:/g) || []).length
  console.log(`[chart-extractor] Table tags visible to OpenAI: ${tableTagCount}`)
  if (!process.env.OPENAI_CHART_EXTRACTION_MODEL && process.env.CHART_EXTRACTION_MODEL) {
    console.warn('[chart-extractor] Ignoring legacy CHART_EXTRACTION_MODEL; using default OPENAI chart extraction model gpt-5.4')
  }

  const chartFocusedContext = buildChartFocusedContext(pdfContent)
  console.log(`[chart-extractor] Chart-focused OpenAI context length: ${chartFocusedContext.length} chars, table tags: ${(chartFocusedContext.match(/\[TABLE:/g) || []).length}, parsed rows: ${(chartFocusedContext.match(/\[PARSED TABLE ROW:/g) || []).length}`)

  const prompt = `Analyze the following medical/scientific document and extract EXACTLY ${maxCharts} of the MOST IMPORTANT and CLINICALLY RELEVANT sets of numerical data for data visualization.

ABSOLUTE ANTI-HALLUCINATION RULES
- EVERY single number you output MUST appear verbatim in the document below.
- If a number does NOT appear in the document text, DO NOT include it.
- DO NOT round, estimate, interpolate, or extrapolate any values.
- DO NOT combine numbers from different tables/contexts into one chart.
- If you cannot find at least 2 data points with exact numbers from the document, return {"charts": []}.

TABLE IDENTIFICATION RULE:
The PDF text can contain multiple tables. When [TABLE: caption] tags are present, use them as the authoritative table boundaries. Before extracting any value:
1. Read all [TABLE: ...] tags first, when present, and identify:
   - Which table is the PRIMARY/WHOLE-DATASET results table (look for keywords: "whole", "overall", "primary", "n=total sample size")
   - Which tables are SUBGROUP tables (look for keywords: "short", "long", "subgroup", "IOL type", "<", ">")
2. For whole-dataset charts, extract values ONLY from the primary results table.
3. For subgroup charts, extract values ONLY from the matching subgroup table.
4. If the same formula name appears in multiple tables with different values, always prefer the table whose caption matches the chart context.
5. Never mix values from different tables into one chart.
6. If no [TABLE: ...] tags survived PDF parsing, still extract from clearly table-like rows and nearby visible captions, but keep each chart tied to one local table section/context.

PARSED ROW HELPERS:
- The document may include [PARSED TABLE ROW: label | values in source order: ...] helper lines after flattened PDF table rows.
- Use these helper lines to understand compact rows where PDF extraction removed column spacing.
- Treat helper values as source text for extraction only when the adjacent original table row and table caption support the same context.
- Do not use helper rows from headers, footnotes, or row fragments as standalone chart data.

HOFFER QST / WHOLE-DATASET SD NUMERIC TRACING RULE
- When extracting SD values for the whole-dataset comparison, use ONLY Table 2 or the table explicitly labeled as the whole-dataset / overall / primary results table.
- Do NOT use values from subgroup tables (short eyes, long eyes, IOL type) or supplemental tables for the whole-dataset SD comparison.
- If the same formula appears in multiple tables with different values, always use the value from the table explicitly labeled as the whole-dataset or primary results table.
- This rule is mandatory for Hoffer QST and all other formulas in the whole-dataset SD chart.

MANDATORY CHART VARIETY RULE
When extracting 2 charts, you are ABSOLUTELY REQUIRED to use 2 VISUALLY DIFFERENT chart families.
BAR-FAMILY means 'bar', 'horizontalBar', and 'stackedBar'. If Chart 1 uses any BAR-FAMILY type, Chart 2 MUST use a non-bar type: 'line', 'pie', 'doughnut', 'radar', or 'boxplot'.

CRITICAL: BOTH CHARTS CANNOT BE THE SAME TYPE
This is your PRIMARY directive. Chart visual variety is MORE important than finding the "perfect" chart type.
Better to use a slightly less optimal non-bar chart type than to return two bar-style charts.

DECISION TREE FOR CHART TYPE:
1. Does the data show DISTRIBUTION STATISTICS (min, Q1, median, Q3, max) for groups? USE 'boxplot'
   Examples: "Rozkład błędu predykcji dla Barrett, Kane, Cooke K6", "Rozkład ciśnienia wewnątrzgałkowego w grupach"
   boxplot requires EXACTLY this data format for each group: {"min": number, "q1": number, "median": number, "q3": number, "max": number}

2. Does the data show MULTIPLE PERCENTAGES summing to ~100% for EACH formula/group? USE 'stackedBar'
   Examples: "Rozkład ciężkości powikłań na grupę", "Wyłączne przedziały błędu refrakcji na grupę"
   stackedBar requires MULTIPLE datasets (one per stack layer), each with ONE value per label

3. Does the data compare 7 or MORE categories? USE 'horizontalBar'
   Examples: "Porównanie MAE dla 8+ formuł IOL", "Ranking formuł wg dokładności"

4. Does the data show change over TIME or progression? USE 'line'
   Examples: "Poprawa ostrości wzroku po 1, 3, 6 miesiącach", "Zmiany ciśnienia wewnątrzgałkowego w czasie"

5. Do the values represent PERCENTAGES that sum to ~100%? USE 'pie' or 'doughnut'
   Examples: "Rozkład powikłań: 70% brak, 20% łagodne, 10% ciężkie", "Odsetek pacjentów w grupach wiekowych"

6. Are you comparing MULTIPLE METRICS across categories? USE 'radar'
   Examples: "Porównanie precyzji, dokładności i stabilności dla 3 formuł"

CHART TYPE SELECTION RULE:
- For data representing cumulative thresholds or sequential intervals, always use "line", not "radar".
- Examples include: % eyes within +/-0.25D, +/-0.50D, +/-0.75D, +/-1.0D.
- Radar charts are only appropriate when axes represent truly independent, non-ordered dimensions.
- For cumulative-threshold line charts, use interval thresholds as labels and formulas/groups as datasets.

7. For categorical comparisons with fewer than 7 categories USE 'bar'
   Examples: "Porównanie MAE dla 3-6 formuł IOL"

🎯 AVAILABLE CHART TYPES (ONLY THESE 8 ARE ALLOWED):
- 'bar' - Vertical bar chart for categorical comparisons (< 7 categories)
- 'horizontalBar' - Horizontal bar chart for comparing many categories (7+ categories), better readability for long names
- 'stackedBar' - Stacked bar chart showing composition (e.g., % eyes within +/-0.25D / +/-0.50D / +/-1.0D per formula)
- 'boxplot' - Box-and-whisker plot showing data distribution (min, Q1, median, Q3, max) - GOLD STANDARD for medical papers
- 'line' - Sequential/temporal data, progression
- 'pie' or 'doughnut' - Percentages, proportions
- 'radar' - Multi-dimensional comparisons

DO NOT USE: 'scatter' or 'polarArea' - these chart types are NOT supported!

CRITICAL REQUIREMENTS:
1. Extract ONLY data that is explicitly present in the document - DO NOT make up, estimate, round, or infer any numbers. Every value MUST be copy-pasted from the source.
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
8. ABSOLUTELY MANDATORY: If extracting 2 charts, you MUST use 2 visually different chart families!
9. CHECKING YOUR WORK: Before returning the JSON, verify that you did NOT return two bar-family charts. 'bar' + 'horizontalBar' is WRONG. 'bar' + 'stackedBar' is WRONG.

AXIS SCALING - REQUIRED FOR EVERY CHART:
- Return axis_min and axis_max for each chart.
- axis_min = minimum numeric data value minus 15% of the data range.
- axis_max = maximum numeric data value plus 15% of the data range.
- Round axis_min DOWN to 2 decimal places and axis_max UP to 2 decimal places.
- For values 0.44-0.50: range = 0.06, padding = 0.009, axis_min = 0.43, axis_max = 0.51.
- For line charts showing multiple formulas across cumulative intervals, set axis_min to the minimum value across all series minus 5, and set axis_max to 100.
- The significance array is not required for line charts; return significance as [] and significance_source as "not_reported".

SIGNIFICANCE ENCODING - REQUIRED FOR BAR-FAMILY CHARTS:
- For bar, horizontalBar, and stackedBar, return a significance array parallel to the first dataset's data array.
- Each value must be exactly: "best", "sig_worse", or "ns".
- "best" means the formula/group had the best value and was statistically significant.
- "sig_worse" means significantly worse than the best formula (p<0.05).
- "ns" means no statistically significant difference vs best.
- Extract this from pairwise comparison tables. If not reported, set all values to "ns" and significance_source to "not_reported".
- For non-bar charts, return significance as [] and significance_source as "not_reported".

Return ONLY a valid JSON object with this exact structure (ALL TEXT IN POLISH):
{
  "charts": [
    {
      "chartTitle": "Porównanie MAE formuł IOL",
      "chartType": "bar",
      "id": "mae_formula_comparison",
      "axis_min": 0.26,
      "axis_max": 0.37,
      "significance": ["sig_worse", "best", "ns", "sig_worse"],
      "significance_source": "Tabela 3",
      "x_axis_label": "Formula IOL",
      "y_axis_label": "MAE (D)",
      "source_table": "Tabela 2",
      "sourceDescription": "Tabela 2 - MAE dla każdej formuły",
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
      "chartType": "line",
      "id": "prediction_error_intervals",
      "axis_min": 34.00,
      "axis_max": 100.00,
      "significance": [],
      "significance_source": "not_reported",
      "x_axis_label": "Przedział błędu predykcji",
      "y_axis_label": "Odsetek oczu (%)",
      "source_table": "Tabela 3",
      "sourceDescription": "Tabela 3 - procent oczu w granicach +/-0.25D, +/-0.50D, +/-1.0D",
      "data": {
        "labels": ["+/-0.25 D", "+/-0.50 D", "+/-0.75 D", "+/-1.0 D"],
        "datasets": [
          {
            "label": "Barrett",
            "data": [42, 72, 88, 95]
          },
          {
            "label": "Cooke K6",
            "data": [48, 78, 90, 97]
          },
          {
            "label": "Kane",
            "data": [45, 75, 89, 96]
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
OK: Chart 1: "Compare MAE for IOL formulas" -> 'bar' + Chart 2: "% eyes within refractive targets" -> 'doughnut'
OK: Chart 1: "MAE ranking for 8+ formulas" -> 'horizontalBar' + Chart 2: "Distribution of prediction errors" -> 'boxplot'
OK: Chart 1: "Visual acuity at 1, 3, 6, 12 months" -> 'line' + Chart 2: "Complication rate distribution" -> 'pie'
OK: Chart 1: "Success rates" -> 'doughnut' + Chart 2: "Multi-metric comparison" -> 'radar'

WRONG: Chart 1: 'bar' + Chart 2: 'bar' - THIS IS NOT ALLOWED!
WRONG: Chart 1: 'bar' + Chart 2: 'horizontalBar' or 'stackedBar' - BOTH ARE BAR-FAMILY!
WRONG: Chart 1: 'line' + Chart 2: 'line' - THIS IS NOT ALLOWED!
CORRECT: Chart 1: 'bar' + Chart 2: 'line' or 'doughnut' - DIFFERENT VISUAL FAMILIES!

IMPORTANT:
- All chart titles MUST be in Polish
- All dataset labels MUST be in Polish (e.g., "Odchylenie standardowe (D)", "Procent oczu (%)", "RMSAE", etc.)
- Formula names in x-axis labels can stay in English (e.g., "Cooke K6", "Barrett", "Kane")
- The sourceDescription is for internal tracking only. The final article will use sequential figure numbering (Rysunek 1, Rysunek 2, Rysunek 3).

If NO suitable numerical data is found in the document, return: {"charts": []}

Document content:
${chartFocusedContext}

Return ONLY the JSON object, no additional text or markdown.`

  try {
    const parsedResponse = await extractChartsWithModelFallback(openai, modelName, prompt)

    const extractedData = getChartsFromResponse(parsedResponse)

    // Log what AI returned
    console.log('[chart-extractor] ===== EXTRACTED CHART TYPES =====')
    extractedData.forEach((chart, i) => {
      console.log(`[chart-extractor] Chart ${i + 1}: "${chart.chartTitle}" -> TYPE: "${chart.chartType}"`)
    })

    enforceChartTypeVariety(sanitizeSupportedChartTypes(extractedData))

    // Cross-verify extracted numbers against source PDF content
    const verifiedData = extractedData.filter(chart => verifyChartDataAgainstSource(chart, pdfContent))
    if (verifiedData.length < extractedData.length) {
      console.warn(`[chart-extractor] Removed ${extractedData.length - verifiedData.length} chart(s) that contained hallucinated data`)
    }

    if (verifiedData.length === 0 && deterministicCharts.length > 0) {
      console.warn('[chart-extractor] OpenAI returned no verified charts; using deterministic parsed-table fallback')
      return deterministicCharts
    }

    if (verifiedData.length > 0 && verifiedData.length < maxCharts) {
      const neededCharts = maxCharts - verifiedData.length
      console.warn(`[chart-extractor] Only ${verifiedData.length}/${maxCharts} verified chart(s); requesting ${neededCharts} supplemental chart(s) from OpenAI`)

      const supplementalPrompt = buildSupplementalChartPrompt(pdfContent, verifiedData, neededCharts)
      const supplementalResponse = await extractChartsWithModelFallback(openai, modelName, supplementalPrompt)
      const supplementalData = sanitizeSupportedChartTypes(getChartsFromResponse(supplementalResponse))
        .filter((chart) => !verifiedData.some((existingChart) => existingChart.chartTitle === chart.chartTitle))

      enforceChartTypeVariety([...verifiedData, ...supplementalData])
      const verifiedSupplementalData = supplementalData.filter(chart => verifyChartDataAgainstSource(chart, pdfContent))

      if (verifiedSupplementalData.length > 0) {
        verifiedData.push(...verifiedSupplementalData)
        enforceChartTypeVariety(verifiedData)
        console.log(`[chart-extractor] Added ${verifiedSupplementalData.length} supplemental verified chart(s)`)
      }
    }

    const combinedData = [...verifiedData]
    for (const chart of deterministicCharts) {
      if (combinedData.length >= maxCharts) break
      if (!combinedData.some((existingChart) => existingChart.id === chart.id || existingChart.chartTitle === chart.chartTitle)) {
        combinedData.push(chart)
      }
    }

    return ensureRequestedChartCount(combinedData, maxCharts)
  } catch (error) {
    console.error('Failed to extract chart data:', error)
    return deterministicCharts
  }
}

/**
 * Verifies that chart data values actually appear in the source PDF content.
 * Helps catch AI hallucination by cross-referencing extracted numbers.
 */
function verifyChartDataAgainstSource(chart: ExtractedChartData, pdfContent: string): boolean {
  const normalizedPdf = pdfContent.toLowerCase().replace(/\s+/g, ' ')

  for (const dataset of chart.data.datasets) {
    if (chart.chartType === 'boxplot') {
      // For boxplot, check that at least some key values appear in the PDF
      let matchCount = 0
      let totalValues = 0
      for (const point of dataset.data) {
        if (typeof point === 'object' && point !== null) {
          const bp = point as BoxPlotDataPoint
          const valuesToCheck = [bp.min, bp.q1, bp.median, bp.q3, bp.max]
          for (const val of valuesToCheck) {
            totalValues++
            if (numberAppearsInSource(val, normalizedPdf)) {
              matchCount++
            }
          }
        }
      }
      // Require at least 30% of boxplot values to be found in the source
      const matchRatio = totalValues > 0 ? matchCount / totalValues : 0
      if (matchRatio < 0.3) {
        console.warn(`[chart-verifier] Boxplot "${chart.chartTitle}": only ${matchCount}/${totalValues} values (${(matchRatio * 100).toFixed(0)}%) found in source PDF - likely hallucinated`)
        return false
      }
      console.log(`[chart-verifier] Boxplot "${chart.chartTitle}": ${matchCount}/${totalValues} values (${(matchRatio * 100).toFixed(0)}%) verified`)
    } else {
      // For numeric charts, check that values appear in the source
      let matchCount = 0
      const numericData = dataset.data as number[]
      for (const val of numericData) {
        if (numberAppearsInSource(val, normalizedPdf)) {
          matchCount++
        }
      }
      // Require at least 50% of values to be found in the source
      const matchRatio = numericData.length > 0 ? matchCount / numericData.length : 0
      if (matchRatio < 0.5) {
        console.warn(`[chart-verifier] Chart "${chart.chartTitle}": only ${matchCount}/${numericData.length} values (${(matchRatio * 100).toFixed(0)}%) found in source PDF - likely hallucinated`)
        return false
      }
      console.log(`[chart-verifier] Chart "${chart.chartTitle}": ${matchCount}/${numericData.length} values (${(matchRatio * 100).toFixed(0)}%) verified`)
    }
  }

  return true
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
    console.warn(`[chart-validator] Unsupported chart type: '${chartData.chartType}'`)
    return false
  }

  if (!chartData.data?.labels || !Array.isArray(chartData.data.labels)) {
    return false
  }

  // Must have at least 2 data points to be a meaningful chart
  if (chartData.data.labels.length < 2) {
    console.warn(`[chart-validator] Too few data points: ${chartData.data.labels.length}`)
    return false
  }

  if (!chartData.data?.datasets || !Array.isArray(chartData.data.datasets)) {
    return false
  }

  // Must have at least 1 dataset
  if (chartData.data.datasets.length === 0) {
    console.warn('[chart-validator] No datasets')
    return false
  }

  // Stacked bar must have at least 2 datasets (stack layers); auto-repair to 'bar' if only 1
  if (chartData.chartType === 'stackedBar' && chartData.data.datasets.length < 2) {
    console.warn('[chart-validator] stackedBar has only 1 dataset; auto-downgrading to "bar"')
    chartData.chartType = 'bar'
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
          console.warn('[chart-validator] Invalid boxplot data point; must have {min, q1, median, q3, max}')
          return false
        }
        // Validate ordering: min <= q1 <= median <= q3 <= max
        if (val.min > val.q1 || val.q1 > val.median || val.median > val.q3 || val.q3 > val.max) {
          console.warn(`[chart-validator] Invalid boxplot ordering: min(${val.min}) <= q1(${val.q1}) <= median(${val.median}) <= q3(${val.q3}) <= max(${val.max})`)
          return false
        }
      }

      // Check that data length matches labels length
      if (dataset.data.length !== chartData.data.labels.length) {
        console.warn(`[chart-validator] Data length (${dataset.data.length}) doesn't match labels (${chartData.data.labels.length})`)
        return false
      }

      continue // Skip numeric validations for boxplot
    }

    // Standard numeric validations for non-boxplot charts
    // Check that all values are real numbers
    if (dataset.data.some((val) => typeof val !== 'number' || isNaN(val as number))) {
      console.warn('[chart-validator] Non-numeric values found')
      return false
    }

    // Check that data length matches labels length
    if (dataset.data.length !== chartData.data.labels.length) {
      console.warn(`[chart-validator] Data length (${dataset.data.length}) doesn't match labels (${chartData.data.labels.length})`)
      return false
    }

    // Reject all-zero data (empty chart)
    const allZero = (dataset.data as number[]).every((val) => val === 0)
    if (allZero) {
      console.warn('[chart-validator] All values are zero - chart would be empty')
      return false
    }

    // Reject if all values are identical (flat line / useless chart)
    const allSame = (dataset.data as number[]).every((val) => val === (dataset.data as number[])[0])
    if (allSame) {
      console.warn(`[chart-validator] All values are identical (${(dataset.data as number[])[0]}) - chart would be meaningless`)
      return false
    }
  }

  return true
}
