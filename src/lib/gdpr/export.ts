/**
 * GDPR Data Export Utilities
 */

export interface UserExportData {
  personal: {
    id: string
    email: string
    name: string
    professionalType?: string
    registrationNumber?: string
    specialization?: string
    createdAt: string
    gdprConsentDate?: string
  }
  articles: Array<{
    id: string
    title: string
    slug: string
    status: string
    createdAt: string
    publishedAt?: string
    viewCount: number
  }>
  activityLog: Array<{
    action: string
    timestamp: string
    details?: string
  }>
  newsletterPreferences?: {
    subscribed: boolean
    frequency: string
    categories: string[]
  }
  consentLog: Array<{
    consentType: string
    consented: boolean
    timestamp: string
  }>
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: any[], headers: string[]): string {
  const csvRows: string[] = []

  // Add header row
  csvRows.push(headers.join(','))

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      // Escape commas and quotes
      const escaped = ('' + value).replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

/**
 * Generate CSV export for user data
 */
export function generateUserDataCSV(exportData: UserExportData): {
  personal: string
  articles: string
  activity: string
} {
  // Personal data CSV
  const personalHeaders = ['Field', 'Value']
  const personalData = Object.entries(exportData.personal).map(([key, value]) => ({
    Field: key,
    Value: value,
  }))
  const personalCSV = convertToCSV(personalData, personalHeaders)

  // Articles CSV
  const articlesHeaders = ['ID', 'Title', 'Slug', 'Status', 'Created', 'Published', 'Views']
  const articlesData = exportData.articles.map((article) => ({
    ID: article.id,
    Title: article.title,
    Slug: article.slug,
    Status: article.status,
    Created: article.createdAt,
    Published: article.publishedAt || '',
    Views: article.viewCount,
  }))
  const articlesCSV = convertToCSV(articlesData, articlesHeaders)

  // Activity log CSV
  const activityHeaders = ['Action', 'Timestamp', 'Details']
  const activityData = exportData.activityLog.map((log) => ({
    Action: log.action,
    Timestamp: log.timestamp,
    Details: log.details || '',
  }))
  const activityCSV = convertToCSV(activityData, activityHeaders)

  return {
    personal: personalCSV,
    articles: articlesCSV,
    activity: activityCSV,
  }
}

/**
 * Create downloadable file blob
 */
export function createDownloadBlob(data: string, type: 'json' | 'csv'): Blob {
  const mimeType = type === 'json' ? 'application/json' : 'text/csv'
  return new Blob([data], { type: mimeType })
}

/**
 * Trigger file download in browser
 */
export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download user data as JSON
 */
export function downloadAsJSON(exportData: UserExportData, userId: string): void {
  const jsonString = JSON.stringify(exportData, null, 2)
  const blob = createDownloadBlob(jsonString, 'json')
  const fileName = `user-data-${userId}-${Date.now()}.json`
  triggerDownload(blob, fileName)
}

/**
 * Download user data as CSV (multiple files in a zip would be ideal)
 */
export function downloadAsCSV(exportData: UserExportData, userId: string): void {
  const csvData = generateUserDataCSV(exportData)

  // For now, download as separate files
  // In production, you might want to use JSZip to create a single zip file
  const timestamp = Date.now()

  // Download personal data
  const personalBlob = createDownloadBlob(csvData.personal, 'csv')
  triggerDownload(personalBlob, `user-personal-${userId}-${timestamp}.csv`)

  // Download articles (if any)
  if (exportData.articles.length > 0) {
    setTimeout(() => {
      const articlesBlob = createDownloadBlob(csvData.articles, 'csv')
      triggerDownload(articlesBlob, `user-articles-${userId}-${timestamp}.csv`)
    }, 100)
  }

  // Download activity log (if any)
  if (exportData.activityLog.length > 0) {
    setTimeout(() => {
      const activityBlob = createDownloadBlob(csvData.activity, 'csv')
      triggerDownload(activityBlob, `user-activity-${userId}-${timestamp}.csv`)
    }, 200)
  }
}
