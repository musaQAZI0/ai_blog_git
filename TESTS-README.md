# 🧪 Quick Test Guide

## Run All Tests (One Command)

### Windows Batch File
```bash
# Basic tests (unit, integration, API)
test-all.bat

# All tests (including E2E and performance)
test-all.bat full
```

### PowerShell
```powershell
# Basic tests (unit, integration, API)
.\test-all.ps1

# All tests (including E2E and performance)
.\test-all.ps1 -Full
```

### Unix/Mac
```bash
# Make executable first
chmod +x scripts/run-all-tests.sh

# Basic tests
./scripts/run-all-tests.sh

# All tests
RUN_E2E=true RUN_PERFORMANCE=true ./scripts/run-all-tests.sh
```

---

## Individual Test Commands

```bash
# Fast tests (run these frequently during development)
npm run test:unit          # Unit tests (~5s)
npm run test:integration   # Integration tests (~15s)
npm run test:api          # API tests (~10s)

# Slower tests (run before committing/deploying)
npm run test:e2e          # E2E browser tests (~1min)
npm run test:performance  # Performance benchmarks (~30s)
npm run test:load         # Load testing (~1-5min)

# All tests with coverage
npm run test:ci           # Everything + coverage report
```

---

## What Gets Tested

✅ **test-all.bat** (Basic Mode):
- ✓ Unit Tests - Chart generation, PDF parsing, caching
- ✓ Integration Tests - Article generation pipeline
- ✓ API Tests - HTTP endpoints, validation, errors
- ✓ Coverage Report - Code coverage analysis

✅ **test-all.bat full** (Extended Mode):
- Everything from basic mode PLUS:
- ✓ E2E Tests - Full user workflows in browser
- ✓ Performance Tests - Benchmarks and optimization validation

---

## Quick Examples

### Example 1: During Development
```bash
# Quick check while coding
npm run test:unit

# Or watch mode (auto-reruns on save)
npm run test:unit -- --watch
```

### Example 2: Before Committing
```bash
# Run core tests
test-all.bat

# Should take ~30 seconds total
```

### Example 3: Before Deploying
```bash
# Run everything including E2E
test-all.bat full

# Should take ~2-3 minutes total
```

### Example 4: Check Performance
```bash
# Benchmark critical operations
npm run test:performance

# Verify system under load
npm run test:load moderate
```

---

## Test Results

### ✅ All Passed
```
========================================
  TEST RESULTS
========================================

[√] ALL TESTS PASSED!

Coverage Report: coverage\lcov-report\index.html
```

### ❌ Some Failed
```
========================================
  TEST RESULTS
========================================

[X] SOME TESTS FAILED

Please check the output above for details.
```

---

## Reports Generated

After running tests, check these reports:

| Report | Location | Description |
|--------|----------|-------------|
| Coverage | `coverage\lcov-report\index.html` | Code coverage metrics |
| E2E | `playwright-report\index.html` | Browser test results |
| Performance | `scripts\performance-report-*.json` | Benchmark data |
| Load | `scripts\load-test-report-*.html` | Load test analysis |

---

## Troubleshooting

### "npm not found"
Install Node.js from https://nodejs.org/

### "Cannot run scripts"
PowerShell execution policy issue. Run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### "Port 3000 already in use"
Kill the process:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Tests timing out
Some tests might need longer on slower machines. Edit timeout in:
- `jest.config.js` - for unit/integration tests
- `playwright.config.ts` - for E2E tests

---

## Pro Tips

💡 **Tip 1:** Run tests in VS Code terminal for better output formatting

💡 **Tip 2:** Use `npm run test:unit -- --watch` during development for instant feedback

💡 **Tip 3:** Check coverage report to see what code isn't tested

💡 **Tip 4:** Run `test-all.bat full` before major releases

💡 **Tip 5:** Performance tests help catch regressions early

---

## Need More Info?

- **Quick Start:** [TESTING-QUICKSTART.md](TESTING-QUICKSTART.md)
- **Full Guide:** [TESTING.md](TESTING.md)
- **Test Files:** `__tests__/` directory

---

**Happy Testing! 🎉**
