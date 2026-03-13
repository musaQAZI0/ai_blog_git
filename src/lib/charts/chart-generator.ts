import { ChartConfiguration } from 'chart.js'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'

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
  type?: 'bar' | 'line' | 'scatter'
}

/**
 * Generates a chart image buffer from data using Chart.js
 * @param chartData The data to visualize (labels and datasets)
 * @param options Chart configuration options
 * @returns Buffer containing the PNG image
 */
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

  const configuration: ChartConfiguration = {
    type,
    data: {
      labels: chartData.labels,
      datasets: chartData.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor || 'rgba(14, 165, 233, 0.7)', // sky-500
        borderColor: dataset.borderColor || 'rgba(14, 165, 233, 1)',
        borderWidth: dataset.borderWidth || 2,
      })),
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: !!title,
          text: title,
          font: {
            size: 18,
            weight: 'bold',
          },
        },
        legend: {
          display: chartData.datasets.length > 1,
          position: 'top',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 12,
            },
          },
        },
        x: {
          ticks: {
            font: {
              size: 12,
            },
          },
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
