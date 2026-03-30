# Load Testing Guide

This guide explains how to perform load testing on the AI Medical Blog application.

## Quick Start

### 1. Simple Load Test (Health Endpoint)

Test the `/api/health` endpoint with concurrent requests:

```bash
# Default: 5 concurrent, 20 total requests
npm run load-test

# Custom: 10 concurrent, 50 total
npm run load-test 10 50

# Test production
API_URL=https://medical-blog-skrzypecki.onrender.com/api/health npm run load-test 5 20
```

**Output Example:**
```
🚀 Simple Load Test
===================
API URL: http://localhost:3000/api/health
Concurrent: 5
Total: 20

✅ #1: 45ms
✅ #2: 52ms
✅ #3: 48ms
...

📊 Results
==========
Total: 20
✅ Success: 20
❌ Failed: 0
⏱️  Total Time: 2.45s
📈 Avg Response: 48ms
🚀 Requests/sec: 8.16
```

### 2. Full Load Test (Article Generation)

Test the `/api/ai/generate` endpoint (requires auth):

```bash
# Default: 2 concurrent, 5 total (SLOW - generates real articles!)
npm run load-test:full

# Custom with PDF file
npm run load-test:full 2 3 ./path/to/test.pdf

# Test production (need to set auth token)
TEST_API_URL=https://your-app.com/api/ai/generate npm run load-test:full 1 2
```

**⚠️ Warning:** This test generates real articles and is **VERY SLOW** (20-40s per request). Use sparingly!

## Test Scenarios

### Scenario 1: Basic Health Check
```bash
npm run load-test 10 100
```
- **Purpose**: Test basic server responsiveness
- **Expected**: <100ms average response time
- **Load**: 10 concurrent requests, 100 total

### Scenario 2: Moderate Load
```bash
npm run load-test 20 200
```
- **Purpose**: Simulate moderate user traffic
- **Expected**: <200ms average response time
- **Load**: 20 concurrent requests, 200 total

### Scenario 3: Stress Test
```bash
npm run load-test 50 500
```
- **Purpose**: Find breaking point
- **Expected**: May see failures or timeouts
- **Load**: 50 concurrent requests, 500 total

### Scenario 4: Article Generation (Production Test)
```bash
npm run load-test:full 1 3
```
- **Purpose**: Test end-to-end article generation
- **Expected**: 20-40s per request, all succeed
- **Load**: 1 at a time (sequential), 3 total
- **⚠️ Cost**: Uses OpenAI/Gemini API credits!

## Interpreting Results

### Good Performance Indicators

✅ **Health Endpoint:**
- Success rate: >99%
- Average response: <100ms
- Requests/sec: >20

✅ **Article Generation:**
- Success rate: 100%
- Average response: 20-40s
- No timeouts

### Warning Signs

⚠️ **Issues:**
- Failed requests: >1%
- Timeouts: Any
- Response time: Increasing over time
- Errors: Memory/connection errors

### Common Issues

**1. Connection Refused**
```
❌ #5: connect ECONNREFUSED
```
**Fix**: Server not running. Start with `npm run dev`

**2. Timeouts**
```
❌ #10: Timeout (120000ms)
```
**Fix**:
- Reduce concurrent requests
- Check server CPU/memory
- Optimize chart generation

**3. Rate Limiting**
```
❌ #50: 429 Too Many Requests
```
**Fix**: Reduce request rate or increase rate limits

## Performance Benchmarks

### Local Development (MacBook Pro M1)

| Endpoint | Concurrent | Total | Avg Response | Success Rate |
|----------|-----------|-------|--------------|--------------|
| /api/health | 10 | 100 | ~45ms | 100% |
| /api/health | 50 | 500 | ~120ms | 99.8% |
| /api/ai/generate | 2 | 5 | ~25s | 100% |

### Production (Render Free Tier)

| Endpoint | Concurrent | Total | Avg Response | Success Rate |
|----------|-----------|-------|--------------|--------------|
| /api/health | 5 | 50 | ~150ms | 100% |
| /api/health | 10 | 100 | ~300ms | 98% |
| /api/ai/generate | 1 | 3 | ~28s | 100% |

**Note**: Render free tier has limitations:
- 30s timeout for HTTP requests
- CPU/memory throttling
- Cold starts (10-15s delay)

## Advanced Testing

### Using Artillery (Professional Tool)

Install Artillery:
```bash
npm install -g artillery
```

Run the test configuration:
```bash
artillery run artillery.yml
```

Features:
- Ramp-up load testing
- Multiple scenarios
- Detailed metrics
- HTML reports

### Custom Test Scripts

Create custom test scripts in `scripts/`:

```javascript
// Example: test-specific-endpoint.js
async function testCustom() {
  // Your test logic
}
```

Run:
```bash
node scripts/test-custom-endpoint.js
```

## Monitoring

While load testing, monitor:

### Server Metrics
- **CPU**: Should stay <80%
- **Memory**: Should not leak
- **Response time**: Should be consistent

### Application Logs
```bash
# Watch logs during test
tail -f logs/app.log
```

### Database
- **Firestore reads/writes**: Monitor quotas
- **Storage**: Check usage

### External APIs
- **OpenAI**: API usage
- **Cloudinary**: Upload bandwidth
- **Firebase**: Function invocations

## Troubleshooting

### Server Crashes During Test

1. **Check memory usage:**
   ```bash
   # Monitor during test
   npm run dev &
   watch -n 1 "ps aux | grep node"
   ```

2. **Reduce concurrency:**
   ```bash
   npm run load-test 2 10  # Lower numbers
   ```

### Inconsistent Response Times

1. **Cold start issue** (Render):
   - First request slow
   - Solution: Warm-up phase

2. **Chart generation bottleneck**:
   - Check chart generation logs
   - Consider caching

### Rate Limit Errors

1. **OpenAI rate limits:**
   - Reduce concurrent article generation
   - Use `load-test:full 1 3` (sequential)

2. **Firebase quotas:**
   - Check Firebase console
   - Upgrade plan if needed

## Best Practices

1. **Start small**: Test with 2-5 concurrent requests first
2. **Gradual increase**: Ramp up slowly to find limits
3. **Monitor**: Watch server metrics during tests
4. **Production testing**: Use off-peak hours
5. **Cost awareness**: Article generation uses API credits
6. **Test locally first**: Debug on local before production

## Continuous Testing

### GitHub Actions (TODO)

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Test

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run load-test 10 100
```

## Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [k6 Load Testing](https://k6.io/)
- [Render Performance Tips](https://render.com/docs/performance)
