@echo off
REM Run All Tests - Simple Batch Script
REM Usage: test-all.bat [full]
REM   test-all.bat       - Run unit, integration, and API tests only
REM   test-all.bat full  - Run ALL tests including E2E, load, and performance

echo.
echo ========================================
echo   AI Medical Blog - Test Runner
echo ========================================
echo.

set FAILED=0

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [Installing] npm dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        exit /b 1
    )
    echo.
)

REM ===== CORE TESTS (Always Run) =====

echo [1/3] Running Unit Tests...
call npm run test:unit -- --ci
if %errorlevel% neq 0 (
    echo [FAILED] Unit Tests
    set FAILED=1
) else (
    echo [PASSED] Unit Tests
)
echo.

echo [2/3] Running Integration Tests...
call npm run test:integration -- --ci
if %errorlevel% neq 0 (
    echo [FAILED] Integration Tests
    set FAILED=1
) else (
    echo [PASSED] Integration Tests
)
echo.

echo [3/3] Running API Tests...
call npm run test:api -- --ci
if %errorlevel% neq 0 (
    echo [FAILED] API Tests
    set FAILED=1
) else (
    echo [PASSED] API Tests
)
echo.

REM ===== OPTIONAL TESTS (Only in Full Mode) =====

if "%1"=="full" (
    echo ========================================
    echo   Running Extended Tests...
    echo ========================================
    echo.

    echo [4/6] Installing Playwright...
    call npx playwright install --with-deps
    echo.

    echo [5/6] Running E2E Tests...
    call npm run test:e2e
    if %errorlevel% neq 0 (
        echo [FAILED] E2E Tests
        set FAILED=1
    ) else (
        echo [PASSED] E2E Tests
    )
    echo.

    echo [6/6] Running Performance Tests...
    call npm run test:performance
    if %errorlevel% neq 0 (
        echo [FAILED] Performance Tests
        set FAILED=1
    ) else (
        echo [PASSED] Performance Tests
    )
    echo.
)

REM ===== GENERATE COVERAGE REPORT =====

echo Generating Coverage Report...
call npm run test:ci
echo.

REM ===== SUMMARY =====

echo ========================================
echo   TEST RESULTS
echo ========================================
echo.

if %FAILED%==1 (
    echo [X] SOME TESTS FAILED
    echo.
    echo Please check the output above for details.
    echo.
    exit /b 1
) else (
    echo [√] ALL TESTS PASSED!
    echo.
    echo Coverage Report: coverage\lcov-report\index.html
    if "%1"=="full" (
        echo E2E Report: playwright-report\index.html
        echo Performance: scripts\performance-report-*.json
    )
    echo.
    echo To run ALL tests including E2E:
    echo   test-all.bat full
    echo.
)

exit /b 0
