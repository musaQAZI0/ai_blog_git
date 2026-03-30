#!/usr/bin/env node

/**
 * Simple Load Test - Health Endpoint
 * Tests the /api/health endpoint with concurrent requests
 *
 * Usage: node scripts/simple-load-test.js [concurrent] [total]
 */

const CONCURRENT = parseInt(process.argv[2] || '5', 10)
const TOTAL = parseInt(process.argv[3] || '20', 10)
const API_URL = process.env.API_URL || 'http://localhost:3000/api/health'

const stats = {
  success: 0,
  failed: 0,
  times: [],
}

console.log('🚀 Simple Load Test')
console.log('===================')
console.log(`API URL: ${API_URL}`)
console.log(`Concurrent: ${CONCURRENT}`)
console.log(`Total: ${TOTAL}`)
console.log('')

async function makeRequest(id) {
  const start = Date.now()

  try {
    const response = await fetch(API_URL)
    const duration = Date.now() - start

    if (response.ok) {
      stats.success++
      stats.times.push(duration)
      console.log(`✅ #${id}: ${duration}ms`)
    } else {
      stats.failed++
      console.log(`❌ #${id}: ${response.status}`)
    }
  } catch (error) {
    const duration = Date.now() - start
    stats.failed++
    console.log(`❌ #${id}: ${error.message} (${duration}ms)`)
  }
}

async function runBatch(startId, count) {
  const promises = []
  for (let i = 0; i < count; i++) {
    promises.push(makeRequest(startId + i))
  }
  await Promise.all(promises)
}

async function run() {
  const start = Date.now()

  let completed = 0
  while (completed < TOTAL) {
    const batchSize = Math.min(CONCURRENT, TOTAL - completed)
    await runBatch(completed + 1, batchSize)
    completed += batchSize
  }

  const duration = Date.now() - start
  const avg = stats.times.reduce((a, b) => a + b, 0) / stats.times.length || 0

  console.log('')
  console.log('📊 Results')
  console.log('==========')
  console.log(`Total: ${TOTAL}`)
  console.log(`✅ Success: ${stats.success}`)
  console.log(`❌ Failed: ${stats.failed}`)
  console.log(`⏱️  Total Time: ${(duration / 1000).toFixed(2)}s`)
  console.log(`📈 Avg Response: ${avg.toFixed(0)}ms`)
  console.log(`🚀 Requests/sec: ${(TOTAL / (duration / 1000)).toFixed(2)}`)
}

run().catch(console.error)
