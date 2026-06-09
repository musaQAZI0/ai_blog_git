## 🧪 Comprehensive Testing Guide

This document covers all testing strategies and scripts for the AI Medical Blog system.

---

## 📋 Table of Contents

- [Test Types Overview](#test-types-overview)
- [Setup Instructions](#setup-instructions)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Performance Benchmarks](#performance-benchmarks)

---

## 🎯 Test Types Overview

### 1. **Unit Tests**
Tests individual functions and components in isolation.

**Location:** `__tests__/unit/`

**Coverage:**
- Chart generation (`chart-generator.test.ts`)
- PDF parsing and caching (`pdf-parser.test.ts`)
- Data extraction
- Text normalization

**Key Features:**
- Fast execution (< 5s total)
- No external dependencies
- Mocked I/O operations

---

### 2. **Integration Tests**
Tests interaction between multiple components.

**Location:** `__tests__/integration/`

**Coverage:**
- Article generation pipeline (`article-generation.test.ts`)
- AI provider integration
- Chart extraction + generation flow
- End-to-end data processing

**Key Features:**
- Mocked AI providers
- Tests complete workflows
- Validates data structure

---

### 3. **API Tests**
Tests HTTP endpoints and request handling.

**Location:** `__tests__/api/`

**Coverage:**
- `/api/ai/generate` route (`generate-route.test.ts`)
- Request validation
- Error handling
- Rate limiting
- Request deduplication

**Key Features:**
- HTTP status code validation
- Response schema validation
- Authentication testing
- Error scenarios

---

### 4. **E2E (End-to-End) Tests**
Tests complete user workflows in a browser.

**Location:** `__tests__/e2e/`

**Coverage:**
- Homepage navigation (`homepage.spec.ts`)
- Article generation workflow (`article-generation.spec.ts`)
- Article listing and filtering (`articles-list.spec.ts`)
- Mobile responsiveness

**Key Features:**
- Real browser automation (Playwright)
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile viewport testing
- Visual regression detection

---

### 5. **Load Tests**
Tests system performance under various load conditions.

**Location:** `scripts/load-test-advanced.js`

**Scenarios:**
- **Light:** 5 concurrent users, 30s
- **Moderate:** 20 concurrent users, 1 min
- **Heavy:** 50 concurrent users, 2 min
- **Stress:** 100 concurrent users, 3 min

**Metrics:**
- Requests per second
- Latency (mean, p90, p99)
- Throughput (MB/s)
- Error rate
- Timeout rate

---

### 6. **Performance Tests**
Tests specific operation performance.

**Location:** `scripts/performance-test.js`

**Measurements:**
- PDF parsing speed (cold vs cached)
- Chart generation time
- Canvas pooling efficiency
- Memory usage
- Parallel operation speedup

---

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This installs all test dependencies including:
- Jest (unit/integration testing)
- Playwright (E2E testing)
- Autocannon (load testing)
- Testing Library (component testing)

### 2. Setup Test Environment

Create test environment variables (optional):

```bash
# .env.test
GEMINI_API_KEY=test-key
OPENAI_API_KEY=test-key
ANTHROPIC_API_KEY=test-key
```

### 3. Install Playwright Browsers

```bash
npx playwright install
```

---

## 🚀 Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- chart-generator
```

**Expected Output:**
```
 PASS  __tests__/unit/chart-generator.test.ts
 PASS  __tests__/unit/pdf-parser.test.ts

Test Suites: 2 passed, 2 total
Tests:       24 passed, 24 total
Time:        4.567s
```

---

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with verbose output
npm run test:integration -- --verbose
```

**Expected Output:**
```
 PASS  __tests__/integration/article-generation.test.ts

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Time:        12.345s
```

---

### API Tests

```bash
# Run all API tests
npm run test:api

# Watch mode
npm run test:api -- --watch
```

**Expected Output:**
```
 PASS  __tests__/api/generate-route.test.ts

Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Time:        8.234s
```

---

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific browser
npm run test:e2e -- --project=chromium

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- homepage

# Debug mode
npm run test:e2e -- --debug
```

**Expected Output:**
```
Running 15 tests using 3 workers

  ✓ [chromium] › homepage.spec.ts:3:1 › Homepage › should load successfully (2s)
  ✓ [firefox] › homepage.spec.ts:3:1 › Homepage › should load successfully (3s)
  ✓ [webkit] › homepage.spec.ts:3:1 › Homepage › should load successfully (4s)

  15 passed (45s)
```

---

### Load Tests

```bash
# Run load test (moderate scenario by default)
npm run test:load

# Run specific scenario
npm run test:load light
npm run test:load heavy
npm run test:load stress

# Custom configuration
BASE_URL=https://your-app.com LOAD_TEST_CONNECTIONS=30 npm run test:load
```

**Expected Output:**
```
🚀 Starting Load Test: Moderate load (20 concurrent users, 1 min)

📊 Testing: Homepage
   URL: http://localhost:3000/

┌─────────┬───────┬────────┬────────┬────────┐
│         │  2.5% │    50% │  97.5% │    Avg │
├─────────┼───────┼────────┼────────┼────────┤
│ Latency │ 12 ms │ 45 ms  │ 89 ms  │ 48 ms  │
└─────────┴───────┴────────┴────────┴────────┘

Requests/sec:  432.5
Total:         25,950

📄 HTML report generated: scripts/load-test-report-1234567890.html
```

---

### Performance Tests

```bash
# Run performance benchmarks
npm run test:performance

# Output includes detailed metrics and JSON report
```

**Expected Output:**
```
🚀 Starting Performance Tests...

📄 Testing PDF Parsing Performance...

✓ PDF Parse (Cold): 234ms (Heap: 1.24MB)
✓ PDF Parse (Cached): 2ms (Heap: 0.01MB)
✓ PDF Parse (5MB): 1256ms (Heap: 6.78MB)

   Cache speedup: 117.00x faster

📊 Testing Chart Generation Performance...

✓ Bar Chart (750x500): 345ms (Heap: 2.34MB)
✓ Bar Chart 2 (Same dims, pooled): 123ms (Heap: 0.45MB)
✓ Line Chart: 298ms (Heap: 2.01MB)

   Canvas pooling speedup: 2.80x

⚡ Testing Parallel Chart Generation...

✓ Sequential Generation (3 charts): 891ms
✓ Parallel Generation (3 charts): 467ms

   Parallel speedup: 1.91x faster

📄 Report saved: scripts/performance-report-1234567890.json
```

---

### All Tests (CI Mode)

```bash
# Run all tests with coverage
npm run test:ci

# Includes:
# - Unit tests
# - Integration tests
# - API tests
# - Coverage report
```

---

## 📊 Test Coverage

View coverage report:

```bash
# Generate coverage
npm run test:ci

# Open HTML report
open coverage/lcov-report/index.html
```

**Coverage Targets:**
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

**Key Files Covered:**
- `src/lib/charts/` - Chart generation
- `src/lib/ai/` - AI integration
- `src/app/api/` - API routes
- `src/lib/storage/` - File storage

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run API tests
        run: npm run test:api

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📈 Performance Benchmarks

### Optimization Results

**PDF Parsing:**
- Cold: ~200-250ms
- Cached: ~1-5ms (117x faster)

**Chart Generation:**
- First chart: ~300-400ms
- Pooled canvas: ~100-150ms (2.8x faster)
- Parallel (3 charts): 1.9x faster than sequential

**Memory Usage:**
- Streaming uploads: 30% less memory
- PDF cache: ~50MB max (50 PDFs)
- Chart generation: ~2-3MB per chart

**API Performance:**
- Simple GET: ~20-50ms
- Article generation: ~60-180s (depends on AI provider)
- Chart extraction: ~15-30s

---

## 🐛 Debugging Tests

### Debug Unit/Integration Tests

```bash
# Run with node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Use VS Code debugger
# Add breakpoint in test file and press F5
```

### Debug E2E Tests

```bash
# Run in debug mode (pauses at each action)
npm run test:e2e -- --debug

# Run headed (see browser)
npm run test:e2e -- --headed

# Slow down execution
npm run test:e2e -- --slow-mo=1000
```

### Debug Load Tests

```bash
# Single connection for easier debugging
LOAD_TEST_CONNECTIONS=1 npm run test:load light
```

---

## 📝 Writing New Tests

### Unit Test Template

```typescript
import { functionToTest } from '@/lib/module'

describe('Module Name', () => {
  beforeEach(() => {
    // Setup
  })

  it('should do something', () => {
    const result = functionToTest('input')
    expect(result).toBe('expected')
  })
})
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should perform action', async ({ page }) => {
    await page.goto('/url')
    await page.click('button')
    await expect(page.locator('selector')).toBeVisible()
  })
})
```

---

## 🎯 Best Practices

1. **Run tests locally** before pushing
2. **Write tests for new features** (TDD recommended)
3. **Keep tests fast** (mock external services)
4. **Use descriptive test names** (describe what, not how)
5. **Test edge cases** (errors, empty data, limits)
6. **Maintain >70% coverage** on critical code
7. **Run E2E tests** before major releases
8. **Monitor performance** regression over time

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Autocannon Docs](https://github.com/mcollina/autocannon)

---

## ❓ Troubleshooting

### Tests failing randomly
- Check for race conditions
- Increase timeouts
- Mock external dependencies

### E2E tests timing out
- Increase `timeout` in playwright.config.ts
- Check if dev server is running
- Verify network connectivity

### Coverage not generated
- Ensure jest.config.js has `collectCoverage: true`
- Run `npm run test:ci` instead of `npm test`

### Load tests showing errors
- Verify BASE_URL is correct
- Check if server is running
- Reduce connections for slower servers

---

## 💬 Support

For questions or issues with tests:
1. Check this documentation
2. Review test file comments
3. Open an issue on GitHub
4. Contact the development team

---

**Last Updated:** 2025-01-09
**Version:** 1.0.0
