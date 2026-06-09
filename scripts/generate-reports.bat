@echo off
REM Generate All Test Reports
REM Creates a timestamped folder with all reports

echo.
echo ========================================
echo   Generating All Test Reports
echo ========================================
echo.

REM Create timestamped folder
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set REPORT_DIR=test-reports-%TIMESTAMP%

echo [1/5] Creating report directory: %REPORT_DIR%
mkdir "%REPORT_DIR%"
echo.

echo [2/5] Running tests and generating coverage...
call npm run test:ci
if exist "coverage" (
    xcopy /E /I /Y coverage "%REPORT_DIR%\coverage"
    echo ✓ Coverage report saved
) else (
    echo ✗ Coverage report not found
)
echo.

echo [3/5] Running E2E tests...
call npm run test:e2e
if exist "playwright-report" (
    xcopy /E /I /Y playwright-report "%REPORT_DIR%\e2e-report"
    echo ✓ E2E report saved
) else (
    echo ✗ E2E report not found
)
echo.

echo [4/5] Running performance tests...
call npm run test:performance
if exist "scripts\performance-report-*.json" (
    for %%f in (scripts\performance-report-*.json) do (
        copy "%%f" "%REPORT_DIR%\performance-report.json"
    )
    echo ✓ Performance report saved
) else (
    echo ✗ Performance report not found
)
echo.

echo [5/5] Running load test...
call npm run test:load light
if exist "scripts\load-test-report-*.html" (
    for %%f in (scripts\load-test-report-*.html) do (
        copy "%%f" "%REPORT_DIR%\load-test-report.html"
    )
    for %%f in (scripts\load-test-report-*.json) do (
        copy "%%f" "%REPORT_DIR%\load-test-report.json"
    )
    echo ✓ Load test report saved
) else (
    echo ✗ Load test report not found
)
echo.

REM Create index file
echo ^<!DOCTYPE html^> > "%REPORT_DIR%\index.html"
echo ^<html^> >> "%REPORT_DIR%\index.html"
echo ^<head^> >> "%REPORT_DIR%\index.html"
echo ^<title^>Test Reports - %TIMESTAMP%^</title^> >> "%REPORT_DIR%\index.html"
echo ^<style^> >> "%REPORT_DIR%\index.html"
echo body { font-family: Arial; max-width: 800px; margin: 50px auto; } >> "%REPORT_DIR%\index.html"
echo h1 { color: #333; } >> "%REPORT_DIR%\index.html"
echo .report { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; } >> "%REPORT_DIR%\index.html"
echo a { color: #0066cc; text-decoration: none; font-size: 18px; } >> "%REPORT_DIR%\index.html"
echo a:hover { text-decoration: underline; } >> "%REPORT_DIR%\index.html"
echo ^</style^> >> "%REPORT_DIR%\index.html"
echo ^</head^> >> "%REPORT_DIR%\index.html"
echo ^<body^> >> "%REPORT_DIR%\index.html"
echo ^<h1^>🧪 Test Reports - %TIMESTAMP%^</h1^> >> "%REPORT_DIR%\index.html"
echo ^<div class="report"^> >> "%REPORT_DIR%\index.html"
echo ^<h2^>📊 Coverage Report^</h2^> >> "%REPORT_DIR%\index.html"
echo ^<a href="coverage/lcov-report/index.html"^>View Coverage Report^</a^> >> "%REPORT_DIR%\index.html"
echo ^</div^> >> "%REPORT_DIR%\index.html"
echo ^<div class="report"^> >> "%REPORT_DIR%\index.html"
echo ^<h2^>🌐 E2E Test Report^</h2^> >> "%REPORT_DIR%\index.html"
echo ^<a href="e2e-report/index.html"^>View E2E Report^</a^> >> "%REPORT_DIR%\index.html"
echo ^</div^> >> "%REPORT_DIR%\index.html"
echo ^<div class="report"^> >> "%REPORT_DIR%\index.html"
echo ^<h2^>⚡ Performance Report^</h2^> >> "%REPORT_DIR%\index.html"
echo ^<a href="performance-report.json"^>View Performance JSON^</a^> >> "%REPORT_DIR%\index.html"
echo ^</div^> >> "%REPORT_DIR%\index.html"
echo ^<div class="report"^> >> "%REPORT_DIR%\index.html"
echo ^<h2^>🔥 Load Test Report^</h2^> >> "%REPORT_DIR%\index.html"
echo ^<a href="load-test-report.html"^>View Load Test HTML^</a^> ^| >> "%REPORT_DIR%\index.html"
echo ^<a href="load-test-report.json"^>View Load Test JSON^</a^> >> "%REPORT_DIR%\index.html"
echo ^</div^> >> "%REPORT_DIR%\index.html"
echo ^</body^> >> "%REPORT_DIR%\index.html"
echo ^</html^> >> "%REPORT_DIR%\index.html"

echo.
echo ========================================
echo   ✅ All Reports Generated!
echo ========================================
echo.
echo Report Location: %REPORT_DIR%
echo.
echo To view all reports, open:
echo   %REPORT_DIR%\index.html
echo.
echo Opening report index...
start %REPORT_DIR%\index.html

pause
