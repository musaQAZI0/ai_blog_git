# Chart Type Selection Fix - Intelligent Chart Variety

## Problem Identified

Your AI blog was **always generating the same repetitive chart types** (bar + line) on every PDF, regardless of the data characteristics. This was caused by **hardcoded fallback logic** that overrode the AI's intelligent chart type selection.

### Root Causes

1. **Hardcoded chartIndex Logic** ([data-extractor.ts:1116](src/lib/charts/data-extractor.ts#L1116)):
   ```typescript
   // OLD CODE (REMOVED):
   const chartType = preferredType || (chartIndex === 0 ? 'bar' : 'line')
   ```
   - Chart 1: Always defaulted to 'bar'
   - Chart 2+: Always defaulted to 'line'
   - This ignored the AI's smart chart type selection!

2. **Simple 'bar' Fallback** ([data-extractor.ts:491](src/lib/charts/data-extractor.ts#L491)):
   ```typescript
   // OLD CODE (REMOVED):
   let chartType = (rawChart.chartType || rawChart.type || 'bar')
   ```
   - Defaulted to 'bar' whenever AI didn't specify a type
   - Didn't analyze data characteristics at all

3. **Dumb Variety Enforcement**:
   - The `pickAlternativeChartType()` function just picked from a static candidate list
   - Didn't consider data characteristics when choosing alternatives

## Solution Implemented

### 1. Intelligent Chart Type Inference Function

Added `inferChartTypeFromData()` function that analyzes data characteristics:

```typescript
function inferChartTypeFromData(data: {
  labels: string[]
  datasets: { label: string; data: any[] }[]
  title?: string
  sourceDescription?: string
}): ChartType
```

**What it does:**
- ✅ **Detects boxplot data** (min, q1, median, q3, max structure)
- ✅ **Detects percentages summing to 100%** → pie/doughnut
- ✅ **Detects stacked bar candidates** (multiple datasets with percentages)
- ✅ **Detects temporal data** (months, weeks, time intervals) → line chart
- ✅ **Detects cumulative intervals** (±0.25D, ±0.50D defocus curves) → line chart
- ✅ **Detects many categories** (7+) → horizontal bar for readability
- ✅ **Detects radar candidates** (3-8 dimensions, all positive values)
- ✅ **Detects multiple datasets** with continuous data → line chart
- ✅ **Default to bar** only as last resort

### 2. Updated normalizeExtractedChart()

Now uses intelligent inference instead of hardcoded 'bar':

```typescript
// NEW CODE:
let chartType = (rawChart.chartType || rawChart.type) as ChartType | undefined
if (!chartType) {
  chartType = inferChartTypeFromData({
    labels, datasets,
    title: chartTitle,
    sourceDescription
  })
  console.log(`AI didn't specify type, inferred '${chartType}' from data`)
}
```

**Benefits:**
- Respects AI's selection when provided
- Uses intelligent fallback based on data
- Logs when inference is used (for debugging)

### 3. Updated buildGenericMetricChart()

Removed hardcoded `chartIndex === 0 ? 'bar' : 'line'` logic:

```typescript
// NEW CODE:
const chartType = preferredType || inferChartTypeFromData({
  labels,
  datasets: [{ label: metricLabel, data: values }],
  title: metricLabel,
  sourceDescription: group.caption
})
```

**Benefits:**
- Each chart gets intelligent type based on its own data
- No more forced bar+line pattern
- Respects preferred type when provided

### 4. Improved pickAlternativeChartType()

Now tries intelligent inference first, then falls back to candidate list:

```typescript
// NEW CODE:
function pickAlternativeChartType(...) {
  // First: Try intelligent inference based on data characteristics
  const intelligentType = inferChartTypeFromData({ labels, datasets, ... })

  if (!blockedTypes.has(intelligentType) &&
      (!blockBarLike || !isBarLikeChartType(intelligentType)) &&
      isCompatibleChartType(chart, intelligentType)) {
    return intelligentType  // ✅ Use intelligent type!
  }

  // Fallback: Use candidate list if intelligent type is blocked
  const candidates = ['line', 'doughnut', 'radar', 'pie', 'boxplot', ...]
  return candidates.find(...) || chart.chartType
}
```

**Benefits:**
- Variety enforcement now respects data characteristics
- Picks the most appropriate alternative type
- Only falls back to static list when necessary

## Expected Behavior Changes

### Before the Fix:
```
PDF 1: Bar chart + Line chart
PDF 2: Bar chart + Line chart
PDF 3: Bar chart + Line chart
...always the same, regardless of data!
```

### After the Fix:
```
PDF with distribution data:
  → Chart 1: Boxplot (min, q1, median, q3, max)
  → Chart 2: Horizontal bar (7+ categories)

PDF with percentages:
  → Chart 1: Pie chart (% summing to 100%)
  → Chart 2: Stacked bar (composition breakdown)

PDF with temporal data:
  → Chart 1: Line chart (progression over time)
  → Chart 2: Radar chart (multi-dimensional comparison)

PDF with standard comparisons:
  → Chart 1: Bar chart (3-6 categories)
  → Chart 2: Line chart (defocus curve, cumulative intervals)
```

## How to Test

1. **Upload a PDF with distribution statistics** (min, Q1, median, Q3, max)
   - Expected: Should generate boxplot

2. **Upload a PDF with percentage breakdown** (values summing to ~100%)
   - Expected: Should generate pie or doughnut chart

3. **Upload a PDF with temporal data** (monthly outcomes, follow-up periods)
   - Expected: Should generate line chart

4. **Upload a PDF with 7+ category comparisons**
   - Expected: Should generate horizontal bar chart

5. **Upload a PDF with stacked composition data**
   - Expected: Should generate stacked bar chart

## Logging for Debugging

The new code includes extensive logging:

```
[chart-extractor] AI didn't specify type, inferred 'boxplot' from data characteristics
[chart-extractor] No preferred type for chart 2, inferred 'line' from data
[chart-variety] Picked intelligent alternative 'radar' based on data characteristics
[chart-variety] Picked fallback alternative 'doughnut' from candidate list
```

Check your console logs when generating articles to see the chart type selection process.

## Files Modified

1. **[src/lib/charts/data-extractor.ts](src/lib/charts/data-extractor.ts)**:
   - Added `inferChartTypeFromData()` function (lines 124-216)
   - Updated `normalizeExtractedChart()` (lines 490-515)
   - Updated `buildGenericMetricChart()` (lines 1114-1127)
   - Improved `pickAlternativeChartType()` (lines 258-297)

## Technical Details

### Chart Type Decision Tree

```
1. Has boxplot structure (min, q1, median, q3, max)?
   → boxplot

2. Single dataset with values summing to ~100%?
   → pie (if ≤5 segments) or doughnut (if >5 segments)

3. Multiple datasets with each label summing to ~100%?
   → stackedBar

4. Temporal labels (months, weeks, days) or cumulative intervals (±0.25D)?
   → line

5. Multiple datasets with 3+ continuous data points?
   → line

6. 7 or more categories?
   → horizontalBar

7. 3-8 categories with all positive values?
   → radar

8. Otherwise
   → bar
```

### Variety Enforcement

The existing variety enforcement logic still works:
- No duplicate chart types
- Maximum one bar-family chart (bar, horizontalBar, stackedBar)
- But now uses intelligent alternatives instead of just picking 'line'

## Summary

✅ **Fixed**: Repetitive bar+line chart pattern
✅ **Added**: Intelligent chart type inference based on data characteristics
✅ **Improved**: Variety enforcement to pick smarter alternatives
✅ **Maintained**: AI's chart type selection is still respected when provided
✅ **Added**: Extensive logging for debugging chart selection

Your AI blog will now generate **diverse, appropriate chart types** based on the actual data in each PDF, not just defaulting to bar+line every time!
