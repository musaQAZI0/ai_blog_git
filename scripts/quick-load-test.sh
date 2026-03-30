#!/bin/bash

# Quick Load Test for Article Generation API
# Usage: ./scripts/quick-load-test.sh [concurrent] [total]

API_URL="${API_URL:-http://localhost:3000/api/health}"
CONCURRENT=${1:-2}
TOTAL=${2:-10}

echo "🚀 Quick Load Test"
echo "=================="
echo "API URL: $API_URL"
echo "Concurrent: $CONCURRENT"
echo "Total Requests: $TOTAL"
echo ""

# Test health endpoint
echo "Testing health endpoint..."
start_time=$(date +%s)

for i in $(seq 1 $TOTAL); do
  (
    curl -s -w "\nRequest $i: %{http_code} - %{time_total}s\n" \
      -o /dev/null \
      "$API_URL"
  ) &

  # Control concurrency
  if (( i % CONCURRENT == 0 )); then
    wait
  fi
done

wait

end_time=$(date +%s)
duration=$((end_time - start_time))

echo ""
echo "✅ Test completed in ${duration}s"
echo "📊 Average: $((duration / TOTAL))s per request"
