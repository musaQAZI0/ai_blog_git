import {
  Chart,
  ChartConfiguration,
  BarController,
  LineController,
  ScatterController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'

// Register all chart types and components
Chart.register(
  BarController,
  LineController,
  ScatterController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
)

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }[]
}

export interface ChartOptions {
  title?: string
  width?: number
  height?: number
  type?: 'bar' | 'line' | 'scatter' | 'pie' | 'doughnut' | 'radar' | 'polarArea'
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

  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: 'white'
  })

  // For pie/doughnut/polarArea charts, use multiple colors for each segment
  const isPieStyle = ['pie', 'doughnut', 'polarArea'].includes(type)

  const configuration: ChartConfiguration = {
    type,
    data: {
      labels: chartData.labels,
      datasets: chartData.datasets.map((dataset, datasetIndex) => {
        // For pie-style charts with single dataset, use different color per segment
        const colors = isPieStyle && dataset.data.length > 1
          ? dataset.data.map((_, i) => PROFESSIONAL_COLORS[i % PROFESSIONAL_COLORS.length])
          : [PROFESSIONAL_COLORS[datasetIndex % PROFESSIONAL_COLORS.length]]

        return {
          label: dataset.label,
          data: dataset.data,
          backgroundColor: dataset.backgroundColor || (isPieStyle
            ? colors.map(c => c.bg)
            : colors[0].bg),
          borderColor: dataset.borderColor || (isPieStyle
            ? colors.map(c => c.border)
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
            tension: 0.2,
            pointRadius: 3,
            pointHoverRadius: 5,
          }),
        }
      }),
    },
    options: {
      responsive: false,
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
          display: chartData.datasets.length > 1 || isPieStyle,
          position: 'top',
          labels: {
            font: {
              size: 13,
              family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
            },
            padding: 15,
            color: '#374151', // gray-700
            usePointStyle: true,
            pointStyle: 'circle',
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
        },
      },
      // Scales only apply to cartesian charts (not pie/doughnut/polarArea)
      ...(!isPieStyle && type !== 'radar' && {
        scales: {
          y: {
            beginAtZero: true,
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
              display: false,
            },
          },
          x: {
            grid: {
              display: type !== 'bar', // Hide x-grid for bar charts
              color: 'rgba(0, 0, 0, 0.08)',
            },
            ticks: {
              font: {
                size: 12,
                family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
              },
              color: '#6b7280', // gray-500
              padding: 8,
              maxRotation: 45,
              minRotation: 0,
            },
          },
        },
      }),
      // Special configuration for radar charts
      ...(type === 'radar' && {
        scales: {
          r: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
            angleLines: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              font: {
                size: 11,
              },
              color: '#6b7280',
              backdropColor: 'rgba(255, 255, 255, 0.75)',
            },
            pointLabels: {
              font: {
                size: 12,
                family: "'DejaVu Sans', 'Noto Sans', 'Arial', sans-serif",
              },
              color: '#374151',
            },
          },
        },
      }),
      // Layout padding for better spacing
      layout: {
        padding: {
          top: 20,
          right: 30,
          bottom: 20,
          left: 30,
        },
      },
    },
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
