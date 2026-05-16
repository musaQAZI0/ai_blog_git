// Chart rendering optimizations for performance

export interface ChartConfig {
  responsive: boolean
  maintainAspectRatio: boolean
  devicePixelRatio?: number
  animation?: {
    duration: number
  }
}

// Get optimal chart configuration based on device
export function getOptimalChartConfig(): ChartConfig {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    responsive: true,
    maintainAspectRatio: true,
    // Use lower DPI on mobile for performance
    devicePixelRatio: isMobile ? 1 : undefined,
    animation: {
      // Disable animations if user prefers reduced motion or on mobile
      duration: prefersReducedMotion || isMobile ? 0 : 400,
    },
  }
}

// Debounce chart resize events
export function createResizeHandler(callback: () => void, delay: number = 300) {
  let timeout: NodeJS.Timeout | null = null

  return () => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(callback, delay)
  }
}

// Lazy load chart libraries
export async function loadChartLibrary() {
  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)
    return Chart
  } catch (error) {
    console.error('Failed to load Chart.js:', error)
    throw error
  }
}

// Optimize chart data for rendering
export function optimizeChartData<T extends Record<string, any>>(
  data: T[],
  maxDataPoints: number = 100
): T[] {
  if (data.length <= maxDataPoints) {
    return data
  }

  // Downsample data if too many points
  const step = Math.ceil(data.length / maxDataPoints)
  return data.filter((_, index) => index % step === 0)
}

// Calculate appropriate font sizes for different devices
export function getChartFontSizes() {
  if (typeof window === 'undefined') {
    return {
      title: 16,
      label: 12,
      tick: 10,
    }
  }

  const width = window.innerWidth

  if (width < 768) {
    // Mobile
    return {
      title: 14,
      label: 11,
      tick: 9,
    }
  }

  if (width < 1024) {
    // Tablet
    return {
      title: 15,
      label: 11,
      tick: 10,
    }
  }

  // Desktop
  return {
    title: 16,
    label: 12,
    tick: 11,
  }
}

// Convert chart to image for better performance on static pages
export async function chartToImage(
  chartId: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const canvas = document.getElementById(chartId) as HTMLCanvasElement
  if (!canvas) return null

  try {
    return canvas.toDataURL(`image/${format}`, 0.9)
  } catch (error) {
    console.error('Failed to convert chart to image:', error)
    return null
  }
}

// Destroy chart instance to prevent memory leaks
export function destroyChart(chartInstance: any) {
  if (chartInstance && typeof chartInstance.destroy === 'function') {
    chartInstance.destroy()
  }
}

// Optimize chart colors for accessibility
export function getAccessibleChartColors(): string[] {
  return [
    '#0066CC', // Blue (WCAG AA compliant)
    '#009900', // Green
    '#CC0000', // Red
    '#FF9900', // Orange
    '#9933CC', // Purple
    '#00CCCC', // Cyan
    '#CC6600', // Brown
    '#0099CC', // Light Blue
  ]
}

// Check if WebGL is available for advanced charts
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch (e) {
    return false
  }
}

// Get optimal chart type based on data size
export function getOptimalChartType(dataPoints: number): 'canvas' | 'svg' {
  // Use canvas for large datasets (better performance)
  // Use SVG for small datasets (better quality, accessibility)
  return dataPoints > 50 ? 'canvas' : 'svg'
}
