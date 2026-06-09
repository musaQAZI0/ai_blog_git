/**
 * Performance Testing Script
 * Measures performance of critical operations:
 * - PDF parsing and caching
 * - Chart generation
 * - Article generation pipeline
 */

const fs = require('fs')
const path = require('path')

// Performance metrics storage
const metrics = {
  pdfParsing: [],
  chartGeneration: [],
  cacheHit: [],
  parallelCharts: [],
  memoryUsage: [],
}

// Utility: Measure execution time
async function measureTime(name, fn) {
  const start = Date.now()
  const startMem = process.memoryUsage()

  try {
    const result = await fn()
    const duration = Date.now() - start
    const endMem = process.memoryUsage()
    const memoryDelta = {
      heapUsed: (endMem.heapUsed - startMem.heapUsed) / 1024 / 1024,
      external: (endMem.external - startMem.external) / 1024 / 1024,
    }

    console.log(`✓ ${name}: ${duration}ms (Heap: ${memoryDelta.heapUsed.toFixed(2)}MB)`)

    return { duration, memoryDelta, result }
  } catch (error) {
    console.error(`✗ ${name}: FAILED -`, error.message)
    throw error
  }
}

// Test 1: PDF Parsing Performance
async function testPdfParsing() {
  console.log('\n📄 Testing PDF Parsing Performance...\n')

  try {
    const { extractTextFromPDF } = require('../src/lib/ai/pdf-parser')

    // Create test PDF buffer
    const testBuffer = Buffer.from('Test PDF content '.repeat(1000))

    // Test 1: First parse (no cache)
    const { duration: firstParse } = await measureTime(
      'PDF Parse (Cold)',
      async () => await extractTextFromPDF(testBuffer)
    )
    metrics.pdfParsing.push({ type: 'cold', duration: firstParse })

    // Test 2: Second parse (should hit cache)
    const { duration: secondParse } = await measureTime(
      'PDF Parse (Cached)',
      async () => await extractTextFromPDF(testBuffer)
    )
    metrics.cacheHit.push({ type: 'pdf', duration: secondParse })

    // Test 3: Large PDF
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024) // 5MB
    const { duration: largeParse } = await measureTime(
      'PDF Parse (5MB)',
      async () => await extractTextFromPDF(largeBuffer)
    )
    metrics.pdfParsing.push({ type: 'large', duration: largeParse })

    console.log(`\n   Cache speedup: ${(firstParse / secondParse).toFixed(2)}x faster`)
  } catch (error) {
    console.error('PDF Parsing test failed:', error.message)
  }
}

// Test 2: Chart Generation Performance
async function testChartGeneration() {
  console.log('\n📊 Testing Chart Generation Performance...\n')

  try {
    const { generateChartImage } = require('../src/lib/charts/chart-generator')

    const chartData = {
      labels: ['A', 'B', 'C', 'D', 'E'],
      datasets: [{ label: 'Test Data', data: [10, 20, 30, 40, 50] }],
    }

    // Test 1: Bar chart
    const { duration: barChart, memoryDelta: barMem } = await measureTime(
      'Bar Chart (750x500)',
      async () =>
        await generateChartImage(chartData, {
          title: 'Test Bar Chart',
          width: 750,
          height: 500,
          type: 'bar',
        })
    )
    metrics.chartGeneration.push({ type: 'bar', duration: barChart, memory: barMem.heapUsed })

    // Test 2: Same dimensions (should reuse canvas)
    const { duration: barChart2 } = await measureTime(
      'Bar Chart 2 (Same dims, pooled)',
      async () =>
        await generateChartImage(chartData, {
          title: 'Test Bar Chart 2',
          width: 750,
          height: 500,
          type: 'bar',
        })
    )
    metrics.chartGeneration.push({ type: 'bar-pooled', duration: barChart2 })

    // Test 3: Different chart types
    const types = ['line', 'pie', 'doughnut', 'radar']
    for (const type of types) {
      const { duration } = await measureTime(
        `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
        async () =>
          await generateChartImage(chartData, {
            title: `Test ${type}`,
            type,
          })
      )
      metrics.chartGeneration.push({ type, duration })
    }

    console.log(`\n   Canvas pooling speedup: ${(barChart / barChart2).toFixed(2)}x`)
  } catch (error) {
    console.error('Chart Generation test failed:', error.message)
  }
}

// Test 3: Parallel Chart Generation
async function testParallelCharts() {
  console.log('\n⚡ Testing Parallel Chart Generation...\n')

  try {
    const { generateChartImage } = require('../src/lib/charts/chart-generator')

    const chartData = {
      labels: ['A', 'B', 'C'],
      datasets: [{ label: 'Data', data: [1, 2, 3] }],
    }

    const chartConfigs = [
      { title: 'Chart 1', type: 'bar' },
      { title: 'Chart 2', type: 'line' },
      { title: 'Chart 3', type: 'pie' },
    ]

    // Sequential generation
    const { duration: sequential } = await measureTime('Sequential Generation (3 charts)', async () => {
      for (const config of chartConfigs) {
        await generateChartImage(chartData, config)
      }
    })

    // Parallel generation
    const { duration: parallel } = await measureTime('Parallel Generation (3 charts)', async () => {
      await Promise.all(
        chartConfigs.map((config) => generateChartImage(chartData, config))
      )
    })

    metrics.parallelCharts.push({
      sequential,
      parallel,
      speedup: (sequential / parallel).toFixed(2),
    })

    console.log(`\n   Parallel speedup: ${(sequential / parallel).toFixed(2)}x faster`)
  } catch (error) {
    console.error('Parallel Charts test failed:', error.message)
  }
}

// Test 4: Memory Usage Monitoring
function testMemoryUsage() {
  console.log('\n💾 Memory Usage Analysis...\n')

  const usage = process.memoryUsage()

  const memInfo = {
    rss: (usage.rss / 1024 / 1024).toFixed(2),
    heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2),
    heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2),
    external: (usage.external / 1024 / 1024).toFixed(2),
    arrayBuffers: (usage.arrayBuffers / 1024 / 1024).toFixed(2),
  }

  console.log(`   RSS:            ${memInfo.rss} MB`)
  console.log(`   Heap Total:     ${memInfo.heapTotal} MB`)
  console.log(`   Heap Used:      ${memInfo.heapUsed} MB`)
  console.log(`   External:       ${memInfo.external} MB`)
  console.log(`   Array Buffers:  ${memInfo.arrayBuffers} MB`)

  metrics.memoryUsage.push(memInfo)

  return memInfo
}

// Generate performance report
function generateReport() {
  console.log('\n\n📊 PERFORMANCE REPORT\n')
  console.log('═'.repeat(80))

  // PDF Parsing
  console.log('\n📄 PDF Parsing:')
  metrics.pdfParsing.forEach((m) => {
    console.log(`   ${m.type}: ${m.duration}ms`)
  })
  if (metrics.cacheHit.length > 0) {
    console.log(`   Cache Hit: ${metrics.cacheHit[0].duration}ms`)
  }

  // Chart Generation
  console.log('\n📊 Chart Generation:')
  metrics.chartGeneration.forEach((m) => {
    console.log(`   ${m.type}: ${m.duration}ms${m.memory ? ` (${m.memory.toFixed(2)}MB)` : ''}`)
  })

  // Parallel Charts
  if (metrics.parallelCharts.length > 0) {
    const parallel = metrics.parallelCharts[0]
    console.log('\n⚡ Parallel Charts:')
    console.log(`   Sequential: ${parallel.sequential}ms`)
    console.log(`   Parallel:   ${parallel.parallel}ms`)
    console.log(`   Speedup:    ${parallel.speedup}x`)
  }

  // Memory
  console.log('\n💾 Memory Usage:')
  metrics.memoryUsage.forEach((m) => {
    console.log(`   Heap Used: ${m.heapUsed}MB`)
  })

  console.log('\n' + '═'.repeat(80))

  // Save report
  const reportPath = path.join(__dirname, `performance-report-${Date.now()}.json`)
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        metrics,
        summary: {
          pdfParsingAvg:
            metrics.pdfParsing.reduce((sum, m) => sum + m.duration, 0) /
            metrics.pdfParsing.length,
          chartGenerationAvg:
            metrics.chartGeneration.reduce((sum, m) => sum + m.duration, 0) /
            metrics.chartGeneration.length,
          parallelSpeedup: metrics.parallelCharts[0]?.speedup || 'N/A',
        },
      },
      null,
      2
    )
  )

  console.log(`\n📄 Report saved: ${reportPath}`)
}

// Main execution
async function main() {
  console.log('🚀 Starting Performance Tests...')

  const startTime = Date.now()
  const startMem = testMemoryUsage()

  try {
    await testPdfParsing()
    await testChartGeneration()
    await testParallelCharts()

    const endMem = testMemoryUsage()
    const totalDuration = Date.now() - startTime

    console.log(`\n\n✅ All tests completed in ${(totalDuration / 1000).toFixed(2)}s`)
    console.log(
      `   Memory Delta: ${(parseFloat(endMem.heapUsed) - parseFloat(startMem.heapUsed)).toFixed(2)}MB`
    )

    generateReport()
  } catch (error) {
    console.error('\n❌ Performance tests failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testPdfParsing,
  testChartGeneration,
  testParallelCharts,
  testMemoryUsage,
}
