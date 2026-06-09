# 📊 Test Reports Guide

## Where Are Test Reports Saved?

Sare test reports automatically save hote hain! Yeh dekho kahan milenge:

---

## 📁 Report Locations

### 1. Coverage Report (Code Coverage)
```
📂 coverage/
  └── lcov-report/
      └── index.html  👈 Open this!
```

**Generate:**
```bash
npm run test:ci
```

**Open:**
```bash
start coverage\lcov-report\index.html
```

**Shows:**
- ✅ Which code is tested
- ❌ Which code is not tested
- 📊 Coverage percentage
- 📈 Line-by-line coverage

---

### 2. E2E Test Report (Browser Tests)
```
📂 playwright-report/
  └── index.html  👈 Open this!
```

**Generate:**
```bash
npm run test:e2e
```

**Open:**
```bash
start playwright-report\index.html
```

**Shows:**
- ✅ Passed tests
- ❌ Failed tests
- 📸 Screenshots of failures
- 🎥 Video recordings
- 🔍 Execution traces

---

### 3. Load Test Report (Performance Under Load)
```
📂 scripts/
  ├── load-test-report-[timestamp].html  👈 Open this!
  └── load-test-report-[timestamp].json
```

**Generate:**
```bash
npm run test:load
```

**Open:**
```bash
# Find latest HTML file in scripts folder
start scripts\load-test-report-*.html
```

**Shows:**
- 📈 Requests per second
- ⏱️ Response times (P50, P90, P99)
- ❌ Error rates
- 🚀 Throughput
- 📊 Latency graphs

---

### 4. Performance Report (Speed Benchmarks)
```
📂 scripts/
  └── performance-report-[timestamp].json
```

**Generate:**
```bash
npm run test:performance
```

**Shows:**
- ⚡ PDF parsing speed
- 📊 Chart generation time
- 💾 Cache effectiveness
- 🧠 Memory usage
- 🔄 Parallel speedup

---

## 🚀 Generate ALL Reports at Once

**Easy Way:**
```bash
# Generate all reports in one folder
npm run test:reports
```

**This Will:**
1. Run all tests
2. Generate all reports
3. Copy them to `test-reports-[timestamp]` folder
4. Create an index.html to view all reports
5. **Automatically open the index page in browser!**

**Folder Structure:**
```
📂 test-reports-20250109_143025/
  ├── index.html                    👈 Start here!
  ├── coverage/                     (Code coverage)
  ├── e2e-report/                   (E2E tests)
  ├── performance-report.json       (Benchmarks)
  ├── load-test-report.html         (Load test)
  └── load-test-report.json         (Load test data)
```

---

## 📊 Quick View Commands

### Windows Command Prompt
```bash
# Coverage
start coverage\lcov-report\index.html

# E2E
start playwright-report\index.html

# Load Test (latest)
for /f %i in ('dir /b /o-d scripts\load-test-report-*.html') do start scripts\%i & goto :done
:done
```

### PowerShell
```powershell
# Coverage
Start-Process coverage\lcov-report\index.html

# E2E
Start-Process playwright-report\index.html

# Load Test (latest)
$latest = Get-ChildItem scripts\load-test-report-*.html | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Start-Process $latest.FullName
```

---

## 🗑️ Clean Old Reports

```bash
# Delete old coverage
rmdir /s /q coverage

# Delete old E2E reports
rmdir /s /q playwright-report

# Delete old load test reports
del scripts\load-test-report-*.html
del scripts\load-test-report-*.json
del scripts\performance-report-*.json

# Delete old test report folders
for /d %d in (test-reports-*) do rmdir /s /q "%d"
```

---

## 📝 Report Summary

| Report Type | Location | Command | Opens Browser |
|------------|----------|---------|---------------|
| **Coverage** | `coverage/lcov-report/` | `npm run test:ci` | No |
| **E2E** | `playwright-report/` | `npm run test:e2e` | No |
| **Load Test** | `scripts/load-test-report-*.html` | `npm run test:load` | **Yes** ✅ |
| **Performance** | `scripts/performance-report-*.json` | `npm run test:performance` | No |
| **All Reports** | `test-reports-[timestamp]/` | `npm run test:reports` | **Yes** ✅ |

---

## 💡 Pro Tips

### Tip 1: Archive Important Reports
```bash
# Keep a report for future reference
xcopy /E /I test-reports-20250109_143025 important-reports\release-v1.0
```

### Tip 2: Share Reports
```bash
# Zip the report folder to share with team
# Right-click folder → Send to → Compressed (zipped) folder
```

### Tip 3: Compare Reports
```bash
# Generate reports before and after optimization
npm run test:reports  # Before
# Make changes
npm run test:reports  # After
# Compare the two folders
```

### Tip 4: Automate Report Generation
```bash
# Add to your workflow
npm run test:reports
# Upload test-reports-* folder to artifact storage
```

---

## 🎯 Common Tasks

### Task 1: Check Code Coverage
```bash
npm run test:ci
start coverage\lcov-report\index.html
```
Look for red lines (untested code)

### Task 2: Debug Failed E2E Test
```bash
npm run test:e2e
start playwright-report\index.html
```
Click on failed test → View trace/screenshots

### Task 3: Verify Performance
```bash
npm run test:performance
type scripts\performance-report-*.json
```
Check if metrics meet requirements

### Task 4: Test Under Load
```bash
npm run test:load moderate
start scripts\load-test-report-*.html
```
Check if system handles load

---

## 📧 CI/CD Integration

### Save Reports in GitHub Actions
```yaml
- name: Generate test reports
  run: npm run test:reports

- name: Upload reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: test-reports-*/
```

### Save Reports in Jenkins
```groovy
publishHTML([
  reportDir: 'coverage/lcov-report',
  reportFiles: 'index.html',
  reportName: 'Coverage Report'
])
```

---

## ❓ FAQ

**Q: Reports nahi ban rahe?**
```bash
# Make sure tests run successfully first
npm run test:ci
```

**Q: Old reports delete kaise karein?**
```bash
# Delete all old reports
rmdir /s /q coverage playwright-report
del scripts\*-report-*.html scripts\*-report-*.json
```

**Q: Report browser mein nahi khul raha?**
```bash
# Manually navigate to file and double-click
# Or use: start <path-to-html-file>
```

**Q: Kitne reports save hote hain?**
- Coverage: 1 (overwrites on each run)
- E2E: 1 (overwrites on each run)
- Load/Performance: New file each time (timestamped)

**Q: Reports kitni space lete hain?**
- Coverage: ~2-5 MB
- E2E: ~5-20 MB (with screenshots)
- Load Test: ~500 KB
- Performance: ~50 KB

---

## 🎉 Summary

**Simplest Way to Save All Reports:**
```bash
npm run test:reports
```

**It Will:**
✅ Run all tests
✅ Generate all reports
✅ Save in organized folder
✅ Open browser automatically

**That's it!** 🚀
