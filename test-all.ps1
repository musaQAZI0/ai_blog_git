# Run All Tests - PowerShell Script
# Usage: .\test-all.ps1 [-Full]
#   .\test-all.ps1       - Run unit, integration, and API tests only
#   .\test-all.ps1 -Full - Run ALL tests including E2E, load, and performance

param(
    [switch]$Full
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI Medical Blog - Test Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$Failed = $false

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "[Installing] npm dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# ===== CORE TESTS (Always Run) =====

Write-Host "[1/3] Running Unit Tests..." -ForegroundColor Blue
npm run test:unit -- --ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAILED] Unit Tests" -ForegroundColor Red
    $Failed = $true
} else {
    Write-Host "[PASSED] Unit Tests" -ForegroundColor Green
}
Write-Host ""

Write-Host "[2/3] Running Integration Tests..." -ForegroundColor Blue
npm run test:integration -- --ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAILED] Integration Tests" -ForegroundColor Red
    $Failed = $true
} else {
    Write-Host "[PASSED] Integration Tests" -ForegroundColor Green
}
Write-Host ""

Write-Host "[3/3] Running API Tests..." -ForegroundColor Blue
npm run test:api -- --ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAILED] API Tests" -ForegroundColor Red
    $Failed = $true
} else {
    Write-Host "[PASSED] API Tests" -ForegroundColor Green
}
Write-Host ""

# ===== OPTIONAL TESTS (Only in Full Mode) =====

if ($Full) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Running Extended Tests..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "[4/6] Installing Playwright..." -ForegroundColor Blue
    npx playwright install --with-deps
    Write-Host ""

    Write-Host "[5/6] Running E2E Tests..." -ForegroundColor Blue
    npm run test:e2e
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAILED] E2E Tests" -ForegroundColor Red
        $Failed = $true
    } else {
        Write-Host "[PASSED] E2E Tests" -ForegroundColor Green
    }
    Write-Host ""

    Write-Host "[6/6] Running Performance Tests..." -ForegroundColor Blue
    npm run test:performance
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAILED] Performance Tests" -ForegroundColor Red
        $Failed = $true
    } else {
        Write-Host "[PASSED] Performance Tests" -ForegroundColor Green
    }
    Write-Host ""
}

# ===== GENERATE COVERAGE REPORT =====

Write-Host "Generating Coverage Report..." -ForegroundColor Blue
npm run test:ci
Write-Host ""

# ===== SUMMARY =====

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Failed) {
    Write-Host "[X] SOME TESTS FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the output above for details." -ForegroundColor Yellow
    Write-Host ""
    exit 1
} else {
    Write-Host "[√] ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Coverage Report: coverage\lcov-report\index.html" -ForegroundColor Cyan
    if ($Full) {
        Write-Host "E2E Report: playwright-report\index.html" -ForegroundColor Cyan
        Write-Host "Performance: scripts\performance-report-*.json" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "To run ALL tests including E2E:" -ForegroundColor Yellow
    Write-Host "  .\test-all.ps1 -Full" -ForegroundColor Yellow
    Write-Host ""
}

exit 0
