import {
  Chart,
  ChartConfiguration,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler
} from 'chart.js'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
import { BoxPlotController, BoxAndWiskers } from '@sgratzl/chartjs-chart-boxplot'

// Register all chart types and components
Chart.register(
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  BoxPlotController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  BoxAndWiskers,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler
)

// Custom plugin to draw tick labels on EVERY spoke of radar charts
const radarAllSpokeTicksPlugin = {
  id: 'radarAllSpokeTicks',
  afterDraw(chart: any) {
    if (chart.config.type !== 'radar') return

    const rScale = chart.scales.r
    if (!rScale) return

    const ctx = chart.ctx
    const centerX = rScale.xCenter
    const centerY = rScale.yCenter
    const ticks = rScale.ticks
    const labels = chart.data.labels || []
    const numLabels = labels.length

    if (numLabels === 0 || !ticks || ticks.length === 0) return

    ctx.save()
    ctx.font = "11px 'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif"
    ctx.fillStyle = '#374151'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // For each spoke (skip the first one at index 0 since Chart.js already draws ticks there)
    for (let spokeIndex = 1; spokeIndex < numLabels; spokeIndex++) {
      // Calculate the angle for this spoke
      // Chart.js radar starts at top (negative Y) and goes clockwise
      const angle = (Math.PI * 2 * spokeIndex) / numLabels - Math.PI / 2

      // For each tick value, draw the label along this spoke
      for (let tickIndex = 0; tickIndex < ticks.length; tickIndex++) {
        const tick = ticks[tickIndex]
        if (tick.label === undefined || tick.label === '' || tick.label === '0') continue

        // Calculate the distance from center for this tick
        const tickValue = tick.value
        const distanceRatio = (tickValue - rScale.min) / (rScale.max - rScale.min)
        const distance = distanceRatio * rScale.drawingArea

        // Calculate position along the spoke
        const x = centerX + Math.cos(angle) * distance
        const y = centerY + Math.sin(angle) * distance

        // Draw backdrop (white background behind text)
        const tickLabel = typeof tick.label === 'string' ? tick.label : String(tick.value)
        const textWidth = ctx.measureText(tickLabel).width
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillRect(x - textWidth / 2 - 3, y - 7, textWidth + 6, 14)

        // Draw the tick label
        ctx.fillStyle = '#374151'
        ctx.fillText(tickLabel, x, y)
      }
    }

    ctx.restore()
  },
}

// Box plot data point format: { min, q1, median, q3, max }
export interface BoxPlotDataPoint {
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[] | BoxPlotDataPoint[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }[]
  axisMin?: number
  axisMax?: number
  significance?: SignificanceStatus[]
  significanceSource?: string
  xAxisLabel?: string
  yAxisLabel?: string
  sourceTable?: string
}

// All supported chart types
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'stackedBar' | 'horizontalBar' | 'boxplot'
export type SignificanceStatus = 'best' | 'sig_worse' | 'ns'

export interface ChartOptions {
  title?: string
  width?: number
  height?: number
  type?: ChartType
}

/**
 * Generates a chart image buffer from data using Chart.js
 * @param chartData The data to visualize (labels and datasets)
 * @param options Chart configuration options
 * @returns Buffer containing the PNG image
 */
// Professional color palette for medical/scientific charts
const PROFESSIONAL_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.75)', border: 'rgba(59, 130, 246, 1)' },      // blue-500
  { bg: 'rgba(16, 185, 129, 0.75)', border: 'rgba(16, 185, 129, 1)' },      // emerald-500
  { bg: 'rgba(251, 146, 60, 0.75)', border: 'rgba(251, 146, 60, 1)' },      // orange-400
  { bg: 'rgba(139, 92, 246, 0.75)', border: 'rgba(139, 92, 246, 1)' },      // violet-500
  { bg: 'rgba(236, 72, 153, 0.75)', border: 'rgba(236, 72, 153, 1)' },      // pink-500
  { bg: 'rgba(14, 165, 233, 0.75)', border: 'rgba(14, 165, 233, 1)' },      // sky-500
  { bg: 'rgba(251, 191, 36, 0.75)', border: 'rgba(251, 191, 36, 1)' },      // amber-400
  { bg: 'rgba(168, 85, 247, 0.75)', border: 'rgba(168, 85, 247, 1)' },      // purple-500
]

const SIG_COLORS: Record<SignificanceStatus, { bg: string; border: string; label: string }> = {
  best: { bg: '#3B6D11', border: '#2C520C', label: 'Najlepsza (p<0,05)' },
  sig_worse: { bg: '#185FA5', border: '#12477C', label: 'Istotnie gorsza (p<0,05)' },
  ns: { bg: '#B4B2A9', border: '#8F8C82', label: 'Brak istotnej roznicy' },
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getSignificanceColors(significance: SignificanceStatus[] | undefined, length: number): {
  backgroundColor: string[]
  borderColor: string[]
} | null {
  if (!Array.isArray(significance) || significance.length !== length) return null

  return {
    backgroundColor: significance.map((status) => SIG_COLORS[status]?.bg || SIG_COLORS.ns.bg),
    borderColor: significance.map((status) => SIG_COLORS[status]?.border || SIG_COLORS.ns.border),
  }
}

function createSignificanceLegendPlugin(chartData: ChartData) {
  if (!Array.isArray(chartData.significance) || chartData.significance.length === 0) return null

  return {
    id: 'significanceLegend',
    afterDraw(chart: any) {
      const ctx = chart.ctx
      const items: SignificanceStatus[] = ['best', 'sig_worse', 'ns']
      const startX = chart.chartArea.left
      let x = startX
      const y = chart.options.plugins?.title?.display ? 58 : 30

      ctx.save()
      ctx.font = "11px 'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif"
      ctx.textBaseline = 'middle'

      for (const status of items) {
        const item = SIG_COLORS[status]
        ctx.fillStyle = item.bg
        ctx.fillRect(x, y - 5, 10, 10)
        ctx.fillStyle = '#4b5563'
        ctx.fillText(item.label, x + 15, y)
        x += ctx.measureText(item.label).width + 36
      }

      const source = chartData.significanceSource && chartData.significanceSource !== 'not_reported'
        ? `Istotnosc statystyczna: ${chartData.significanceSource}`
        : 'Porownania parami niedostepne w dokumencie'
      ctx.font = "10px 'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif"
      ctx.fillStyle = '#6b7280'
      ctx.fillText(source, startX, y + 18)
      ctx.restore()
    },
  }
}

export async function generateChartImage(
  chartData: ChartData,
  options: ChartOptions = {}
): Promise<Buffer> {
  const {
    title = '',
    width = 800,
    height = 600,
    type = 'bar'
  } = options

  // Map our custom types to Chart.js native types
  const isStackedBar = type === 'stackedBar'
  const isHorizontalBar = type === 'horizontalBar'
  const isBoxPlot = type === 'boxplot'
  const isBarStyle = type === 'bar' || type === 'horizontalBar' || type === 'stackedBar'
  const chartJsType = isStackedBar || isHorizontalBar ? 'bar' : isBoxPlot ? 'boxplot' : type

  // DEBUG: Log chart type and verify controller registration
  console.log(`[chart-generator] 🎨 Generating chart with type: "${type}" (Chart.js type: "${chartJsType}")`)

  // Verify the requested controller exists by checking if Chart.js can create it
  try {
    const testController = Chart.registry.getController(chartJsType)
    console.log(`[chart-generator] ✓ Controller for "${chartJsType}" is registered:`, !!testController)
  } catch (error) {
    console.error(`[chart-generator] ❌ Controller for "${chartJsType}" NOT found! Chart will fail to render.`)
  }

  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: 'white'
  })

  // For pie/doughnut charts, use multiple colors for each segment
  const isPieStyle = ['pie', 'doughnut'].includes(type)

  console.log(`[chart-generator] 🔧 Creating configuration with type: "${chartJsType}", isPieStyle: ${isPieStyle}`)

  const configuration: ChartConfiguration = {
    type: chartJsType as any,
    data: {
      labels: chartData.labels,
      datasets: chartData.datasets.map((dataset, datasetIndex) => {
        // For pie-style charts with single dataset, use different color per segment
        const colors = isPieStyle && dataset.data.length > 1
          ? dataset.data.map((_, i) => PROFESSIONAL_COLORS[i % PROFESSIONAL_COLORS.length])
          : [PROFESSIONAL_COLORS[datasetIndex % PROFESSIONAL_COLORS.length]]
        const sigColors = isBarStyle && datasetIndex === 0
          ? getSignificanceColors(chartData.significance, dataset.data.length)
          : null

        return {
          label: dataset.label,
          data: dataset.data as any,
          backgroundColor: dataset.backgroundColor || sigColors?.backgroundColor || (isPieStyle
            ? colors.map(c => c.bg)
            : isBoxPlot
              ? PROFESSIONAL_COLORS[datasetIndex % PROFESSIONAL_COLORS.length].bg
              : colors[0].bg),
          borderColor: dataset.borderColor || sigColors?.borderColor || (isPieStyle
            ? colors.map(c => c.border)
            : isBoxPlot
              ? PROFESSIONAL_COLORS[datasetIndex % PROFESSIONAL_COLORS.length].border
              : colors[0].border),
          borderWidth: dataset.borderWidth || 2,
          // Additional styling for different chart types
          ...(type === 'line' && {
            fill: false,
            tension: 0.4, // Smooth curves
            pointRadius: 4,
            pointHoverRadius: 6,
          }),
          ...(type === 'radar' && {
            fill: true,
            tension: 0, // Straight lines to ensure clean closing of polygon
            spanGaps: false, // Ensure line closes all the way around
            pointRadius: 5,
            pointHoverRadius: 7,
            pointStyle: 'circle',
            borderWidth: 3,
            borderJoinStyle: 'round' as const, // Smooth joins at each vertex
            // Override background color for radar - much more transparent
            backgroundColor: (typeof dataset.backgroundColor === 'string' ? dataset.backgroundColor : colors[0].bg).replace('0.75', '0.2'),
          }),
          // Box plot styling
          ...(isBoxPlot && {
            borderWidth: 2,
            outlierBackgroundColor: 'rgba(239, 68, 68, 0.8)',
            outlierBorderColor: 'rgba(239, 68, 68, 1)',
            outlierRadius: 4,
            medianColor: 'rgba(0, 0, 0, 0.9)',
            itemRadius: 0, // Hide individual data points
          }),
        }
      }),
    },
    options: {
      responsive: false,
      // Horizontal bar: flip the axis
      ...(isHorizontalBar && { indexAxis: 'y' as const }),
      plugins: {
        title: {
          display: !!title,
          text: title,
          font: {
            size: 20,
            weight: 'bold',
            family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
          },
          padding: {
            top: 10,
            bottom: 20,
          },
          color: '#1f2937', // gray-800
        },
        legend: {
          display: chartData.datasets.length > 1 || isPieStyle || isStackedBar,
          position: isPieStyle ? 'right' : 'top',
          labels: {
            font: {
              size: 13,
              family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
            },
            padding: 15,
            color: '#374151', // gray-700
            usePointStyle: true,
            pointStyle: 'circle',
            // For pie/doughnut charts, show values in legend
            generateLabels: isPieStyle ? (chart) => {
              const data = chart.data
              if (data.labels && data.datasets && data.datasets.length > 0) {
                const dataset = data.datasets[0]
                const total = (dataset.data as number[]).reduce((acc, val) => acc + val, 0)

                return (data.labels as string[]).map((label, i) => {
                  const value = (dataset.data as number[])[i]
                  const percentage = ((value / total) * 100).toFixed(1)
                  return {
                    text: `${label}: ${value} (${percentage}%)`,
                    fillStyle: Array.isArray(dataset.backgroundColor)
                      ? dataset.backgroundColor[i]
                      : dataset.backgroundColor,
                    hidden: false,
                    index: i,
                  }
                })
              }
              return []
            } : undefined,
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: {
            size: 14,
            weight: 'bold',
          },
          bodyFont: {
            size: 13,
          },
          padding: 12,
          cornerRadius: 6,
          displayColors: true,
          callbacks: {
            label: (context: any) => {
              const value = isHorizontalBar ? context.parsed?.x : context.parsed?.y
              const baseLabel = `${context.dataset.label}: ${isFiniteNumber(value) ? value.toFixed(2) : context.formattedValue}`
              const sig = chartData.significance?.[context.dataIndex]
              const sigLabel = sig === 'best'
                ? ' - najlepsza (p<0,05)'
                : sig === 'sig_worse'
                  ? ' - p<0,05 vs najlepsza'
                  : sig === 'ns'
                    ? ' - brak istotnej roznicy'
                    : ''
              return `${baseLabel}${sigLabel}`
            },
          },
        },
      },
      // Scales for cartesian charts (bar, line, stackedBar, horizontalBar, boxplot)
      ...(!isPieStyle && type !== 'radar' && {
        scales: {
          y: {
            beginAtZero: !isFiniteNumber(chartData.axisMin) && !isHorizontalBar,
            ...(isFiniteNumber(chartData.axisMin) && !isHorizontalBar && { min: chartData.axisMin }),
            ...(isFiniteNumber(chartData.axisMax) && !isHorizontalBar && { max: chartData.axisMax }),
            // Stacked bar: stack the Y axis
            ...(isStackedBar && { stacked: true }),
            grid: {
              color: 'rgba(0, 0, 0, 0.08)',
              lineWidth: 1,
            },
            ticks: {
              font: {
                size: 12,
                family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
              },
              color: '#6b7280', // gray-500
              padding: 8,
            },
            title: {
              display: Boolean(chartData.yAxisLabel && !isHorizontalBar),
              text: chartData.yAxisLabel,
              color: '#6b7280',
              font: {
                size: 11,
                family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
              },
            },
          },
          x: {
            beginAtZero: !isFiniteNumber(chartData.axisMin) && isHorizontalBar,
            ...(isFiniteNumber(chartData.axisMin) && isHorizontalBar && { min: chartData.axisMin }),
            ...(isFiniteNumber(chartData.axisMax) && isHorizontalBar && { max: chartData.axisMax }),
            // Stacked bar: stack the X axis
            ...(isStackedBar && { stacked: true }),
            grid: {
              display: type !== 'bar' && !isStackedBar && !isHorizontalBar,
              color: 'rgba(0, 0, 0, 0.08)',
            },
            ticks: {
              font: {
                size: 12,
                family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
              },
              color: '#6b7280', // gray-500
              padding: 8,
              maxRotation: isHorizontalBar ? 0 : 45,
              minRotation: 0,
            },
            title: {
              display: Boolean(chartData.xAxisLabel && isHorizontalBar),
              text: chartData.xAxisLabel,
              color: '#6b7280',
              font: {
                size: 11,
                family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
              },
            },
          },
        },
      }),
      // Special configuration for radar charts
      ...(type === 'radar' && {
        scales: {
          r: {
            beginAtZero: true,
            min: 0,
            grid: {
              color: 'rgba(0, 0, 0, 0.15)',
              lineWidth: 1.5,
              circular: true,
            },
            angleLines: {
              color: 'rgba(0, 0, 0, 0.15)',
              lineWidth: 1.5,
            },
            ticks: {
              font: {
                size: 11,
                family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
              },
              color: '#374151',
              backdropColor: 'rgba(255, 255, 255, 0.9)',
              backdropPadding: 3,
              stepSize: undefined, // Auto-calculate
              showLabelBackdrop: true,
              // Keep default ticks on first spoke visible
            },
            pointLabels: {
              font: {
                size: 13,
                weight: 'bold',
                family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
              },
              color: '#1f2937',
              padding: 10,
            },
          },
        },
      }),
      // Layout padding for better spacing
      layout: {
        padding: {
          top: Array.isArray(chartData.significance) && chartData.significance.length > 0 ? 58 : 20,
          right: isHorizontalBar ? 40 : 30, // Extra right padding for horizontal labels
          bottom: 20,
          left: isHorizontalBar ? 20 : 30, // Less left padding for horizontal bars
        },
      },
    },
  }

  // Add the custom plugin for radar charts to show tick labels on all spokes
  if (type === 'radar') {
    if (!configuration.plugins) {
      configuration.plugins = []
    }
    configuration.plugins.push(radarAllSpokeTicksPlugin)
  }

  const significanceLegendPlugin = createSignificanceLegendPlugin(chartData)
  if (significanceLegendPlugin) {
    if (!configuration.plugins) {
      configuration.plugins = []
    }
    configuration.plugins.push(significanceLegendPlugin)
  }

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration)
  return imageBuffer
}

/**
 * Generates a simple bar chart with single dataset
 * @param labels X-axis labels
 * @param values Y-axis values
 * @param datasetLabel Label for the dataset
 * @param chartTitle Optional chart title
 * @returns Buffer containing the PNG image
 */
export async function generateSimpleBarChart(
  labels: string[],
  values: number[],
  datasetLabel: string,
  chartTitle?: string
): Promise<Buffer> {
  return generateChartImage(
    {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data: values,
        },
      ],
    },
    {
      title: chartTitle,
      type: 'bar',
    }
  )
}
