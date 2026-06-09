/**
 * Advanced Load Testing Script
 * Uses autocannon for high-performance load testing
 * Tests API endpoints under various load conditions
 */

const autocannon = require('autocannon')
const fs = require('fs')
const path = require('path')

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const DURATION = parseInt(process.env.LOAD_TEST_DURATION || '60', 10) // seconds
const CONNECTIONS = parseInt(process.env.LOAD_TEST_CONNECTIONS || '10', 10)
const PIPELINING = parseInt(process.env.LOAD_TEST_PIPELINING || '1', 10)

// Test scenarios
const scenarios = {
  light: {
    connections: 5,
    duration: 30,
    pipelining: 1,
    description: 'Light load (5 concurrent users, 30s)',
  },
  moderate: {
    connections: 20,
    duration: 60,
    pipelining: 1,
    description: 'Moderate load (20 concurrent users, 1 min)',
  },
  heavy: {
    connections: 50,
    duration: 120,
    pipelining: 1,
    description: 'Heavy load (50 concurrent users, 2 min)',
  },
  stress: {
    connections: 100,
    duration: 180,
    pipelining: 1,
    description: 'Stress test (100 concurrent users, 3 min)',
  },
}

// Get scenario from command line or use moderate as default
const scenarioName = process.argv[2] || 'moderate'
const scenario = scenarios[scenarioName] || scenarios.moderate

console.log(`\n🚀 Starting Load Test: ${scenario.description}\n`)

// Test endpoints
const endpoints = [
  {
    name: 'Homepage',
    path: '/',
    method: 'GET',
  },
  {
    name: 'Articles List API',
    path: '/api/articles?page=1&limit=10',
    method: 'GET',
  },
  {
    name: 'Health Check',
    path: '/api/health',
    method: 'GET',
  },
]

// Results storage
const results = []

// Run load test for each endpoint
async function runLoadTest(endpoint) {
  console.log(`\n📊 Testing: ${endpoint.name}`)
  console.log(`   URL: ${BASE_URL}${endpoint.path}`)
  console.log(`   Method: ${endpoint.method}`)
  console.log(`   Connections: ${scenario.connections}`)
  console.log(`   Duration: ${scenario.duration}s\n`)

  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: `${BASE_URL}${endpoint.path}`,
        method: endpoint.method,
        connections: scenario.connections,
        duration: scenario.duration,
        pipelining: scenario.pipelining,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LoadTest/1.0',
        },
      },
      (err, result) => {
        if (err) {
          console.error(`❌ Error testing ${endpoint.name}:`, err)
          reject(err)
        } else {
          results.push({
            endpoint: endpoint.name,
            path: endpoint.path,
            ...result,
          })
          resolve(result)
        }
      }
    )

    // Print progress
    autocannon.track(instance, {
      renderProgressBar: true,
      renderResultsTable: true,
    })
  })
}

// Generate HTML report
function generateHtmlReport() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - ${new Date().toLocaleString()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }
        .label {
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        table {
            width: 100%;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        th {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
        }
        td {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        tr:hover {
            background: #f9f9f9;
        }
        .status-good { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-bad { color: #ef4444; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Load Test Report</h1>
        <p>Scenario: ${scenario.description}</p>
        <p>Date: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        ${results
          .map(
            (r) => `
        <div class="card">
            <div class="label">${r.endpoint}</div>
            <div class="metric">${r.requests.average.toFixed(1)} req/s</div>
            <div>Latency: ${r.latency.mean.toFixed(2)}ms</div>
            <div>Total Requests: ${r.requests.total}</div>
        </div>
        `
          )
          .join('')}
    </div>

    <table>
        <thead>
            <tr>
                <th>Endpoint</th>
                <th>Requests/sec</th>
                <th>Avg Latency</th>
                <th>P99 Latency</th>
                <th>Throughput</th>
                <th>Errors</th>
            </tr>
        </thead>
        <tbody>
            ${results
              .map(
                (r) => `
            <tr>
                <td><strong>${r.endpoint}</strong><br><small>${r.path}</small></td>
                <td class="${r.requests.average > 100 ? 'status-good' : r.requests.average > 50 ? 'status-warning' : 'status-bad'}">${r.requests.average.toFixed(1)}</td>
                <td>${r.latency.mean.toFixed(2)}ms</td>
                <td>${r.latency.p99.toFixed(2)}ms</td>
                <td>${(r.throughput.average / 1024 / 1024).toFixed(2)} MB/s</td>
                <td class="${r.errors === 0 ? 'status-good' : 'status-bad'}">${r.errors}</td>
            </tr>
            `
              )
              .join('')}
        </tbody>
    </table>

    <div class="card">
        <h3>Latency Distribution</h3>
        ${results
          .map(
            (r) => `
        <p><strong>${r.endpoint}</strong></p>
        <ul>
            <li>Mean: ${r.latency.mean.toFixed(2)}ms</li>
            <li>P50: ${r.latency.p50.toFixed(2)}ms</li>
            <li>P90: ${r.latency.p90.toFixed(2)}ms</li>
            <li>P99: ${r.latency.p99.toFixed(2)}ms</li>
            <li>Max: ${r.latency.max.toFixed(2)}ms</li>
        </ul>
        `
          )
          .join('')}
    </div>
</body>
</html>
  `

  const reportPath = path.join(__dirname, `load-test-report-${Date.now()}.html`)
  fs.writeFileSync(reportPath, html)
  console.log(`\n📄 HTML report generated: ${reportPath}`)
}

// Main execution
async function main() {
  try {
    console.log('🔥 Load Test Configuration:')
    console.log(`   Base URL: ${BASE_URL}`)
    console.log(`   Scenario: ${scenarioName}`)
    console.log(`   Duration: ${scenario.duration}s`)
    console.log(`   Connections: ${scenario.connections}`)
    console.log(`   Pipelining: ${scenario.pipelining}`)

    // Run tests sequentially for each endpoint
    for (const endpoint of endpoints) {
      await runLoadTest(endpoint)
      // Wait a bit between tests
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }

    // Print summary
    console.log('\n\n📊 LOAD TEST SUMMARY\n')
    console.log('═'.repeat(80))

    results.forEach((r) => {
      console.log(`\n${r.endpoint}:`)
      console.log(`  Requests/sec:   ${r.requests.average.toFixed(1)}`)
      console.log(`  Avg Latency:    ${r.latency.mean.toFixed(2)}ms`)
      console.log(`  P99 Latency:    ${r.latency.p99.toFixed(2)}ms`)
      console.log(`  Total Requests: ${r.requests.total}`)
      console.log(`  Errors:         ${r.errors}`)
      console.log(`  Timeouts:       ${r.timeouts}`)
      console.log(`  Throughput:     ${(r.throughput.average / 1024 / 1024).toFixed(2)} MB/s`)
    })

    console.log('\n' + '═'.repeat(80))

    // Generate reports
    generateHtmlReport()

    // Save JSON report
    const jsonReportPath = path.join(__dirname, `load-test-report-${Date.now()}.json`)
    fs.writeFileSync(
      jsonReportPath,
      JSON.stringify(
        {
          scenario: scenarioName,
          config: scenario,
          timestamp: new Date().toISOString(),
          results,
        },
        null,
        2
      )
    )
    console.log(`📄 JSON report generated: ${jsonReportPath}`)

    console.log('\n✅ Load test completed successfully!\n')
  } catch (error) {
    console.error('\n❌ Load test failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { runLoadTest, scenarios }
