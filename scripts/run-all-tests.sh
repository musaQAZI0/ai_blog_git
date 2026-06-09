#!/bin/bash

# Comprehensive Testing Script
# Runs all test types and generates reports

set -e  # Exit on error

echo "🚀 AI Medical Blog - Comprehensive Test Suite"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track results
FAILED_TESTS=""

# Function to run tests and track failures
run_test() {
    local test_name=$1
    local test_command=$2

    echo -e "${BLUE}▶ Running $test_name...${NC}"

    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name passed${NC}\n"
    else
        echo -e "${RED}✗ $test_name failed${NC}\n"
        FAILED_TESTS="$FAILED_TESTS\n- $test_name"
    fi
}

# Check if node modules are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

# 1. UNIT TESTS
run_test "Unit Tests" "npm run test:unit -- --ci"

# 2. INTEGRATION TESTS
run_test "Integration Tests" "npm run test:integration -- --ci"

# 3. API TESTS
run_test "API Tests" "npm run test:api -- --ci"

# 4. COVERAGE REPORT
echo -e "${BLUE}📊 Generating coverage report...${NC}"
npm run test:ci
echo -e "${GREEN}✓ Coverage report generated at coverage/lcov-report/index.html${NC}\n"

# 5. E2E TESTS (optional - slow)
if [ "$RUN_E2E" = "true" ]; then
    echo -e "${BLUE}🌐 Installing Playwright browsers...${NC}"
    npx playwright install --with-deps

    run_test "E2E Tests" "npm run test:e2e"
else
    echo -e "${YELLOW}⚠ Skipping E2E tests (set RUN_E2E=true to run)${NC}\n"
fi

# 6. PERFORMANCE TESTS (optional)
if [ "$RUN_PERFORMANCE" = "true" ]; then
    run_test "Performance Tests" "npm run test:performance"
else
    echo -e "${YELLOW}⚠ Skipping performance tests (set RUN_PERFORMANCE=true to run)${NC}\n"
fi

# 7. LOAD TESTS (optional)
if [ "$RUN_LOAD" = "true" ]; then
    echo -e "${BLUE}🔥 Running load tests...${NC}"
    npm run test:load light
    echo -e "${GREEN}✓ Load tests completed${NC}\n"
else
    echo -e "${YELLOW}⚠ Skipping load tests (set RUN_LOAD=true to run)${NC}\n"
fi

# SUMMARY
echo "=============================================="
echo "📋 TEST SUMMARY"
echo "=============================================="

if [ -z "$FAILED_TESTS" ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed:${NC}"
    echo -e "$FAILED_TESTS"
    exit 1
fi

echo ""
echo "📄 Reports generated:"
echo "  - Coverage: coverage/lcov-report/index.html"
if [ "$RUN_E2E" = "true" ]; then
    echo "  - E2E: playwright-report/index.html"
fi
if [ "$RUN_LOAD" = "true" ]; then
    echo "  - Load: scripts/load-test-report-*.html"
fi
if [ "$RUN_PERFORMANCE" = "true" ]; then
    echo "  - Performance: scripts/performance-report-*.json"
fi

echo ""
echo "✅ Testing complete!"
