#!/usr/bin/env node

/**
 * Load Testing Script for Article Generation API
 *
 * Usage:
 *   node scripts/load-test.js [concurrent] [total]
 *
 * Examples:
 *   node scripts/load-test.js 2 5    # 2 concurrent requests, 5 total
 *   node scripts/load-test.js 5 10   # 5 concurrent, 10 total
 */

const fs = require('fs')
const path = require('path')

// Configuration
const API_URL = process.env.TEST_API_URL || 'http://localhost:3000/api/ai/generate'
const CONCURRENT_REQUESTS = parseInt(process.argv[2] || '2', 10)
const TOTAL_REQUESTS = parseInt(process.argv[3] || '5', 10)
const PDF_PATH = process.argv[4] || null

// Stats
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  timeouts: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null,
}

console.log('📊 Article Generation API - Load Test\n')
console.log(`Configuration:`)
console.log(`  API URL: ${API_URL}`)
console.log(`  Concurrent Requests: ${CONCURRENT_REQUESTS}`)
console.log(`  Total Requests: ${TOTAL_REQUESTS}`)
console.log(`  PDF File: ${PDF_PATH || 'Using sample data'}\n`)

// Sample PDF content (if no file provided)
const SAMPLE_PDF_CONTENT = `
Performance of formulas included in the ESCRS intraocular lens power calculator

Abstract: This retrospective study evaluated 748 eyes to compare IOL calculation formulas.

Results:
- Cooke K6 formula had the lowest SD of prediction errors (0.44 D)
- Kane formula was most accurate for long eyes (AL > 25mm)
- Barrett, EVO, and Hoffer QST showed higher SD values

Conclusion: Formula selection should be individualized based on eye characteristics.
`

/**
 * Create FormData with test PDF
 */
async function createTestFormData() {
  const FormData = (await import('form-data')).default
  const formData = new FormData()

  if (PDF_PATH && fs.existsSync(PDF_PATH)) {
    // Use actual PDF file
    const pdfBuffer = fs.readFileSync(PDF_PATH)
    formData.append('files', pdfBuffer, {
      filename: path.basename(PDF_PATH),
      contentType: 'application/pdf',
    })
  } else {
    // Use mock PDF (text file for testing)
    const textBuffer = Buffer.from(SAMPLE_PDF_CONTENT)
    formData.append('files', textBuffer, {
      filename: 'test-article.txt',
      contentType: 'text/plain',
    })
  }

  formData.append('targetAudience', 'professional')
  formData.append('provider', 'gemini')

  return formData
}

/**
 * Single API request with timing
 */
async function makeRequest(requestId) {
  const startTime = Date.now()

  try {
    const formData = await createTestFormData()

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders ? formData.getHeaders() : {},
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`)
    }

    const data = await response.json()

    stats.success++
    stats.responseTimes.push(duration)

    console.log(`✅ Request #${requestId}: ${duration}ms (Success)`)

    return { success: true, duration, data }
  } catch (error) {
    const endTime = Date.now()
    const duration = endTime - startTime

    stats.failed++

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      stats.timeouts++
      console.log(`⏱️  Request #${requestId}: ${duration}ms (Timeout)`)
    } else {
      console.log(`❌ Request #${requestId}: ${duration}ms (Error: ${error.message})`)
    }

    stats.errors.push({
      requestId,
      duration,
      error: error.message,
    })

    return { success: false, duration, error: error.message }
  }
}

/**
 * Run concurrent batch of requests
 */
async function runBatch(startId, count) {
  const promises = []

  for (let i = 0; i < count; i++) {
    const requestId = startId + i
    promises.push(makeRequest(requestId))
  }

  return Promise.all(promises)
}

/**
 * Main load test runner
 */
async function runLoadTest() {
  stats.startTime = Date.now()
  stats.total = TOTAL_REQUESTS

  console.log(`\n🚀 Starting load test...\n`)

  let completed = 0

  while (completed < TOTAL_REQUESTS) {
    const batchSize = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - completed)

    console.log(`\n📦 Batch ${Math.floor(completed / CONCURRENT_REQUESTS) + 1}: Running ${batchSize} concurrent requests...`)

    await runBatch(completed + 1, batchSize)

    completed += batchSize

    // Small delay between batches
    if (completed < TOTAL_REQUESTS) {
      console.log(`\n⏸️  Waiting 2 seconds before next batch...\n`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  stats.endTime = Date.now()
}

/**
 * Print final statistics
 */
function printStats() {
  const totalDuration = stats.endTime - stats.startTime
  const avgResponseTime = stats.responseTimes.length > 0
    ? stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length
    : 0
  const minResponseTime = stats.responseTimes.length > 0
    ? Math.min(...stats.responseTimes)
    : 0
  const maxResponseTime = stats.responseTimes.length > 0
    ? Math.max(...stats.responseTimes)
    : 0

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 Load Test Results`)
  console.log(`${'='.repeat(60)}\n`)

  console.log(`Total Requests:     ${stats.total}`)
  console.log(`✅ Successful:       ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`)
  console.log(`❌ Failed:           ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`)
  console.log(`⏱️  Timeouts:         ${stats.timeouts}`)

  console.log(`\nTiming:`)
  console.log(`  Total Duration:   ${(totalDuration / 1000).toFixed(2)}s`)
  console.log(`  Avg Response:     ${(avgResponseTime / 1000).toFixed(2)}s`)
  console.log(`  Min Response:     ${(minResponseTime / 1000).toFixed(2)}s`)
  console.log(`  Max Response:     ${(maxResponseTime / 1000).toFixed(2)}s`)
  console.log(`  Requests/sec:     ${(stats.total / (totalDuration / 1000)).toFixed(2)}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors:`)
    stats.errors.slice(0, 5).forEach(err => {
      console.log(`  Request #${err.requestId}: ${err.error}`)
    })
    if (stats.errors.length > 5) {
      console.log(`  ... and ${stats.errors.length - 5} more errors`)
    }
  }

  console.log(`\n${'='.repeat(60)}\n`)
}

/**
 * Run the load test
 */
runLoadTest()
  .then(() => {
    printStats()
    process.exit(stats.failed > 0 ? 1 : 0)
  })
  .catch(error => {
    console.error('\n❌ Load test failed:', error)
    process.exit(1)
  })
