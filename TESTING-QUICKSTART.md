# 🚀 Testing Quick Start Guide

## ⚡ Quick Commands

```bash
# Install dependencies first
npm install

# Run all tests at once
npm run test:ci

# Or run individually:
npm run test:unit        # Unit tests (~5s)
npm run test:integration # Integration tests (~15s)
npm run test:api         # API tests (~10s)
npm run test:e2e         # E2E tests (~1min)
npm run test:load        # Load tests (~1-5min)
npm run test:performance # Performance tests (~30s)
```

---

## 📊 Test Types Cheat Sheet

| Type | Command | Duration | Use When |
|------|---------|----------|----------|
| Unit | `npm run test:unit` | ~5s | Testing functions |
| Integration | `npm run test:integration` | ~15s | Testing workflows |
| API | `npm run test:api` | ~10s | Testing endpoints |
| E2E | `npm run test:e2e` | ~1min | Testing UI flows |
| Load | `npm run test:load` | ~1-5min | Testing performance |

---

## 🎯 Before You Start

### 1. First Time Setup

```bash
# Install all dependencies
npm install

# For E2E tests, install browsers
npx playwright install
```

### 2. Run Your First Test

```bash
# Start with unit tests (fastest)
npm run test:unit
```

Expected output:
```
 PASS  __tests__/unit/chart-generator.test.ts
 PASS  __tests__/unit/pdf-parser.test.ts

Tests: 24 passed, 24 total
Time:  4.567s
```

---

## 🔥 Common Testing Scenarios

### Scenario 1: I Just Changed Chart Code

```bash
# Run chart-specific unit tests
npm run test:unit -- chart-generator

# Check if it still works end-to-end
npm run test:integration
```

### Scenario 2: I Modified API Routes

```bash
# Test API endpoints
npm run test:api

# Verify E2E still works
npm run test:e2e -- article-generation
```

### Scenario 3: I Added Optimizations

```bash
# Measure performance impact
npm run test:performance

# Check if it handles load
npm run test:load moderate
```

### Scenario 4: Before Deploying

```bash
# Run everything with coverage
npm run test:ci

# Run load test to verify production readiness
npm run test:load heavy

# Optional: Full E2E test
npm run test:e2e
```

---

## 📈 Understanding Test Results

### ✅ Good Test Run

```
 PASS  __tests__/unit/chart-generator.test.ts
  ✓ should generate bar chart (234ms)
  ✓ should handle different chart types (189ms)

Tests: 10 passed, 10 total
```

**What to do:** Nothing! Tests are passing. ✅

---

### ❌ Failed Test

```
 FAIL  __tests__/unit/chart-generator.test.ts
  ✕ should generate bar chart (234ms)

  Error: Expected buffer but got undefined
```

**What to do:**
1. Read the error message
2. Check which test failed
3. Look at the test file
4. Fix the code
5. Re-run: `npm run test:unit`

---

### ⚠️ Slow Tests

```
 PASS  __tests__/integration/article-generation.test.ts (25.4s)
  ✓ should generate article (23456ms)
```

**What to do:**
- Tests over 10s might need optimization
- Check if external services are slow
- Consider mocking heavy operations

---

## 🐛 Debugging Tests

### Debug Unit Tests

```bash
# Add console.log in your test
it('should work', () => {
  console.log('Debug info:', data)
  expect(data).toBe(expected)
})

# Run test
npm run test:unit
```

### Debug E2E Tests

```bash
# See the browser in action
npm run test:e2e -- --headed

# Slow down for observation
npm run test:e2e -- --headed --slow-mo=1000

# Debug mode (pauses at each step)
npm run test:e2e -- --debug
```

### Debug Load Tests

```bash
# Reduce connections for easier debugging
LOAD_TEST_CONNECTIONS=1 npm run test:load light
```

---

## 📊 Load Test Scenarios

### Light Load (Development)
```bash
npm run test:load light
# 5 users, 30 seconds
# Use for: Quick checks during development
```

### Moderate Load (Staging)
```bash
npm run test:load moderate
# 20 users, 1 minute (default)
# Use for: Pre-deployment testing
```

### Heavy Load (Production Readiness)
```bash
npm run test:load heavy
# 50 users, 2 minutes
# Use for: Before major releases
```

### Stress Test (Breaking Point)
```bash
npm run test:load stress
# 100 users, 3 minutes
# Use for: Finding system limits
```

---

## 💡 Pro Tips

### 1. Run Tests in Watch Mode

```bash
npm run test:unit -- --watch
```

Tests re-run automatically when you save files!

### 2. Run Only Changed Tests

```bash
npm run test:unit -- --onlyChanged
```

Faster iteration during development.

### 3. Run Specific Test

```bash
# By file name
npm run test:unit -- pdf-parser

# By test name
npm run test:unit -- -t "should cache"
```

### 4. See Test Coverage

```bash
npm run test:ci

# Open HTML report
open coverage/lcov-report/index.html  # Mac/Linux
start coverage\lcov-report\index.html  # Windows
```

### 5. Generate Performance Reports

```bash
npm run test:performance

# Check JSON report
cat scripts/performance-report-*.json
```

---

## 🔧 Troubleshooting

### "Cannot find module"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Port already in use"

```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill
```

### "Playwright browser not found"

```bash
# Install Playwright browsers
npx playwright install
```

### Tests timing out

```bash
# Increase timeout in test
it('slow test', async () => {
  // ...
}, 30000) // 30 seconds

# Or in jest.config.js
testTimeout: 30000
```

---

## 📚 Next Steps

1. **Read Full Guide:** See [TESTING.md](TESTING.md) for comprehensive documentation

2. **Write Your Own Tests:** Check `__tests__/` for examples

3. **CI/CD Integration:** Add tests to your GitHub Actions workflow

4. **Monitor Performance:** Run regular load tests to catch regressions

---

## 🆘 Need Help?

- **Test failing?** Check the error message and stack trace
- **Don't understand a test?** Read comments in test files
- **Need new test?** Copy existing test as template
- **Found a bug?** Write a failing test first, then fix it

---

## ✅ Checklist Before Deploying

- [ ] All unit tests pass (`npm run test:unit`)
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] All API tests pass (`npm run test:api`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Load test passes (`npm run test:load moderate`)
- [ ] Code coverage > 70% (`npm run test:ci`)
- [ ] No console errors in tests
- [ ] Performance metrics acceptable

---

**Happy Testing! 🧪**

For detailed information, see [TESTING.md](TESTING.md)
