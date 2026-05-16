// Performance monitoring utilities

// Web Vitals metric interface (matches Next.js reportWebVitals)
export interface WebVitalsMetric {
  id: string
  name: string
  value: number
  label: 'web-vital' | 'custom'
  startTime?: number
  rating?: 'good' | 'needs-improvement' | 'poor'
}

// Legacy interface for backwards compatibility
export interface PerformanceMetrics {
  FCP?: number // First Contentful Paint
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  TTFB?: number // Time to First Byte
  INP?: number // Interaction to Next Paint
}

// Report Web Vitals to analytics
export function reportWebVitals(metric: WebVitalsMetric) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Performance Metric:', metric)
  }

  // Send to analytics service in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Example: Google Analytics
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.value),
        event_label: metric.id,
        non_interaction: true,
      })
    }

    // Example: Custom analytics endpoint
    navigator.sendBeacon('/api/analytics/vitals', JSON.stringify(metric))
  }
}

// Measure component render time
export function measureComponentRender(componentName: string) {
  const start = performance.now()

  return () => {
    const end = performance.now()
    const duration = end - start

    if (process.env.NODE_ENV === 'development' && duration > 16) {
      // Warn if component takes longer than 1 frame (16ms)
      console.warn(`[Performance] ${componentName} took ${duration.toFixed(2)}ms to render`)
    }

    return duration
  }
}

// Lazy load images with Intersection Observer
export function setupLazyLoading() {
  if (typeof window === 'undefined') return

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        if (img.dataset.src) {
          img.src = img.dataset.src
          img.classList.remove('lazy')
          imageObserver.unobserve(img)
        }
      }
    })
  })

  document.querySelectorAll('img.lazy').forEach((img) => {
    imageObserver.observe(img)
  })
}

// Prefetch critical resources
export function prefetchResources(urls: string[]) {
  if (typeof window === 'undefined') return

  urls.forEach((url) => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  })
}

// Optimize event listeners with passive flag
export function addPassiveEventListener(
  element: HTMLElement | Window,
  event: string,
  handler: EventListener
) {
  element.addEventListener(event, handler, { passive: true })
}

// Debounce function for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

// Throttle function for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Detect device type
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'

  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// Check if device has touch support
export function hasTouchSupport(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Optimize scroll performance
export function optimizeScroll(callback: () => void) {
  let ticking = false

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        callback()
        ticking = false
      })
      ticking = true
    }
  }

  return handleScroll
}

// Memory usage monitoring (Chrome only)
export function monitorMemory() {
  if (typeof window === 'undefined') return null

  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    }
  }

  return null
}

// Network information (experimental)
export function getNetworkInfo() {
  if (typeof window === 'undefined') return null

  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection

  if (connection) {
    return {
      effectiveType: connection.effectiveType, // 'slow-2g', '2g', '3g', '4g'
      downlink: connection.downlink, // Mbps
      rtt: connection.rtt, // Round trip time in ms
      saveData: connection.saveData, // Data saver mode
    }
  }

  return null
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}
