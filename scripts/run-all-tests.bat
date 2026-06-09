@echo off
REM Comprehensive Testing Script for Windows
REM Runs all test types and generates reports

echo.
echo 🚀 AI Medical Blog - Comprehensive Test Suite
echo ==============================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    call npm install
    echo.
)

REM 1. UNIT TESTS
echo ▶ Running Unit Tests...
call npm run test:unit -- --ci
if %errorlevel% neq 0 (
    echo ✗ Unit Tests failed
    set "FAILED=1"
) else (
    echo ✓ Unit Tests passed
)
echo.

REM 2. INTEGRATION TESTS
echo ▶ Running Integration Tests...
call npm run test:integration -- --ci
if %errorlevel% neq 0 (
    echo ✗ Integration Tests failed
    set "FAILED=1"
) else (
    echo ✓ Integration Tests passed
)
echo.

REM 3. API TESTS
echo ▶ Running API Tests...
call npm run test:api -- --ci
if %errorlevel% neq 0 (
    echo ✗ API Tests failed
    set "FAILED=1"
) else (
    echo ✓ API Tests passed
)
echo.

REM 4. COVERAGE REPORT
echo 📊 Generating coverage report...
call npm run test:ci
echo ✓ Coverage report generated at coverage\lcov-report\index.html
echo.

REM 5. E2E TESTS (optional)
if "%RUN_E2E%"=="true" (
    echo 🌐 Installing Playwright browsers...
    call npx playwright install --with-deps
    echo.
    echo ▶ Running E2E Tests...
    call npm run test:e2e
    if %errorlevel% neq 0 (
        echo ✗ E2E Tests failed
        set "FAILED=1"
    ) else (
        echo ✓ E2E Tests passed
    )
    echo.
) else (
    echo ⚠ Skipping E2E tests (set RUN_E2E=true to run)
    echo.
)

REM 6. PERFORMANCE TESTS (optional)
if "%RUN_PERFORMANCE%"=="true" (
    echo ▶ Running Performance Tests...
    call npm run test:performance
    if %errorlevel% neq 0 (
        echo ✗ Performance Tests failed
        set "FAILED=1"
    ) else (
        echo ✓ Performance Tests passed
    )
    echo.
) else (
    echo ⚠ Skipping performance tests (set RUN_PERFORMANCE=true to run)
    echo.
)

REM 7. LOAD TESTS (optional)
if "%RUN_LOAD%"=="true" (
    echo 🔥 Running load tests...
    call npm run test:load light
    if %errorlevel% neq 0 (
        echo ✗ Load Tests failed
        set "FAILED=1"
    ) else (
        echo ✓ Load Tests completed
    )
    echo.
) else (
    echo ⚠ Skipping load tests (set RUN_LOAD=true to run)
    echo.
)

REM SUMMARY
echo ==============================================
echo 📋 TEST SUMMARY
echo ==============================================
echo.

if "%FAILED%"=="1" (
    echo ✗ Some tests failed!
    echo Please check the output above for details.
    exit /b 1
) else (
    echo ✓ All tests passed!
)

echo.
echo 📄 Reports generated:
echo   - Coverage: coverage\lcov-report\index.html
if "%RUN_E2E%"=="true" (
    echo   - E2E: playwright-report\index.html
)
if "%RUN_LOAD%"=="true" (
    echo   - Load: scripts\load-test-report-*.html
)
if "%RUN_PERFORMANCE%"=="true" (
    echo   - Performance: scripts\performance-report-*.json
)

echo.
echo ✅ Testing complete!
pause
