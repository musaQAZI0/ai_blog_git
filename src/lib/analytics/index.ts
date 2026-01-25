/**
 * Analytics Integration
 */

export interface AnalyticsEvent {
  name: string
  params?: Record<string, any>
}

/**
 * Track page view
 */
export function trackPageView(url: string, title: string): void {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'page_view',
      page_path: url,
      page_title: title,
    })
  }
}

/**
 * Track custom event
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: event.name,
      ...event.params,
    })
  }
}

/**
 * Track article view
 */
export function trackArticleView(articleId: string, title: string, targetAudience: string): void {
  trackEvent({
    name: 'article_view',
    params: {
      article_id: articleId,
      article_title: title,
      target_audience: targetAudience,
    },
  })
}

/**
 * Track user registration
 */
export function trackRegistration(userType: string): void {
  trackEvent({
    name: 'sign_up',
    params: {
      method: 'email',
      user_type: userType,
    },
  })
}

/**
 * Track newsletter subscription
 */
export function trackNewsletterSubscription(): void {
  trackEvent({
    name: 'newsletter_subscribe',
    params: {
      method: 'website_form',
    },
  })
}

/**
 * Track PDF download
 */
export function trackPDFDownload(articleId: string): void {
  trackEvent({
    name: 'file_download',
    params: {
      file_type: 'pdf',
      article_id: articleId,
    },
  })
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string, resultsCount: number): void {
  trackEvent({
    name: 'search',
    params: {
      search_term: searchTerm,
      results_count: resultsCount,
    },
  })
}

/**
 * Initialize Google Analytics 4
 */
export function initializeGA4(measurementId: string): void {
  if (typeof window === 'undefined') return

  // Check if already initialized
  if (document.querySelector(`script[src*="${measurementId}"]`)) {
    return
  }

  // Add gtag script
  const script = document.createElement('script')
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  script.async = true
  document.head.appendChild(script)

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || []
  function gtag(...args: any[]) {
    window.dataLayer.push(args)
  }
  gtag('js', new Date())
  gtag('config', measurementId, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=Lax;Secure',
  })
}

/**
 * Get analytics data (server-side)
 * Requires Google Analytics Data API credentials
 */
export async function getAnalyticsData(
  startDate: string,
  endDate: string,
  metrics: string[] = ['sessions', 'pageviews', 'users']
): Promise<any> {
  // This would use Google Analytics Data API
  // Install: npm install @google-analytics/data

  console.log('Analytics Data API - Install @google-analytics/data package')

  /*
  import { BetaAnalyticsDataClient } from '@google-analytics/data'

  const propertyId = process.env.GA4_PROPERTY_ID

  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY,
    },
  })

  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate,
        endDate,
      },
    ],
    metrics: metrics.map(name => ({ name })),
    dimensions: [{ name: 'date' }],
  })

  return response
  */

  return {
    message: 'Analytics data requires Google Analytics Data API setup',
    metrics,
  }
}

// Extend Window interface for Google Analytics
declare global {
  interface Window {
    dataLayer: any[]
    gtag?: (...args: any[]) => void
  }
}
