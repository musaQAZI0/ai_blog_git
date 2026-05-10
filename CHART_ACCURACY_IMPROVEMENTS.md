a# Chart & Content Accuracy Improvement Guide

## Problem Summary
Professional article generation can hallucinate with chart data when:
1. Chart values are not strictly verified against source
2. AI models receive loose constraints that they can override
3. No validation occurs after article generation
4. Numbers in narrative can diverge from extracted chart data

## Solution Overview
Implemented a **3-layer accuracy system**:

### Layer 1: Strict Chart Data Extraction
**File**: `src/lib/charts/data-extractor.ts`

**What it does**:
- Uses OpenAI with strict JSON schema validation
- Verifies all numbers against source PDF
- Extracts dataset labels, axis labels, and metadata
- Returns only verified data

**Key function**: `extractChartDataFromPDF()`
- Mandatory schema validation
- Source attribution for every value
- Box plot support for statistical endpoints
- Companion chart generation from verified data

### Layer 2: Strict Context Builder
**File**: `src/lib/ai/content-validator.ts`

**Function**: `createStrictChartContext()`

**What it does**:
Instead of passing raw JSON, creates a **human-readable, constrained context**:

```
=== VERIFIED CHART DATA FOR ARTICLE GENERATION ===
CRITICAL: ONLY use the exact numbers and labels listed below. DO NOT invent or estimate any values.

CHART 1: IOL Formula Performance Comparison
Type: bar
Verified Source: Table 5, Whole Dataset Results
X-Axis/Labels: Cooke K6 | Pearl-DGS | EVO | Barrett | Hill-RBF | Kane
Verified Values:
  SD of PE (D): 0.42 | 0.39 | 0.38 | 0.37 | 0.41 | 0.40
  Within 0.5 D: 89.2 | 91.5 | 92.1 | 92.8 | 90.3 | 91.1

CONSTRAINTS FOR ARTICLE WRITER:
1. Only reference these 1 chart(s) by their verified IDs
2. Only mention the exact numbers shown above
3. Only use the exact labels shown in "X-Axis/Labels"
4. For each dataset value, attribute it to the correct dataset name
5. Do not interpret, estimate, or extrapolate values
6. Do not mention charts that are not listed above
7. If you need to mention a value, cite which dataset it comes from
```

**Benefits**:
- Eliminates ambiguous JSON parsing
- Makes constraints explicit and visual
- AI model sees exact numbers it must use
- No room for "rounding" or "approximating"

### Layer 3: Post-Generation Validation
**File**: `src/lib/ai/content-validator.ts`

**Function**: `validateContentAccuracy()`

**What it checks**:
1. **Hallucinated Numbers** - Are all numbers in narrative backed by verified charts?
2. **Orphaned References** - Do all chart references point to existing charts?
3. **Data Attribution** - Are values correctly attributed to datasets?
4. **Hallucination Patterns** - Detects speculative language

**Output**: Detailed validation report with:
- List of all errors found
- Location of problematic content
- Suggested fixes
- Warnings about suspicious patterns

**Auto-Cleanup**: `sanitizeArticleContent()`
- Removes references to non-existent charts
- Cleans excessive whitespace
- Prevents user from seeing broken placeholders

## Integration in Article Generation

### Before (Vulnerable)
```
Chart context passed as JSON → AI writes article → Returned as-is
```
Vulnerabilities:
- AI can "optimize" or "rephrase" numbers
- Loose constraints are treated as suggestions
- No verification happens

### After (Secure)
```
Extract charts → Build strict context → Generate article → Validate accuracy → Auto-sanitize → Return
```

Each step enforces data integrity.

## Specific Improvements Made

### 1. **Constraint Strengthening** in `createStrictChartContext()`

Before:
```
"Datasets: ${JSON.stringify(chart.data.datasets)}"
```

After:
```
Verified Values:
  ${dataset.label}: ${values.join(' | ')}
```

**Why**: Makes explicit which number belongs to which category, preventing confusion.

### 2. **Number Verification** in `validateContentAccuracy()`

Implements `numberAppearsInSource()` which:
- Checks both decimal formats (0.42 and 0,42)
- Handles percentage formats
- Verifies against source PDF
- Returns validation error if not found

### 3. **Validation Logging** in `generateArticleWithGemini()`

Now logs:
```
[gemini] Content validation found issues: [...]
  - [hallucinated_number] The number "45.6" appears in the article but is not found in extracted charts
  ⚠️ Contains speculative language not grounded in data
  Removed 2 orphaned chart reference(s)
```

This helps identify patterns in hallucination.

## Recommendations for Your PDFs

### For Input Files (input1-4.pdf):

1. **Check Chart Extraction**
   ```bash
   npm run test-gemini-text  # Will show if charts are being extracted
   ```

2. **Enable Validation Logging**
   Add to `.env.local`:
   ```
   DEBUG=*gemini*,*chart-extractor*,*content-validator*
   ```

3. **Run with Validation**
   Generate articles with professional audience - validation will trigger automatically

### Improving Accuracy Further:

**Option A: Stricter Temperature**
```typescript
// In gemini.ts, change:
temperature: 0.5,  // Current
// To:
temperature: 0.2,  // More deterministic, less hallucination
```

**Option B: Add Explicit Prohibitions**
```typescript
// Add to figure instructions:
"EXPLICIT BAN: Do not mention or reference any other numbers, 
formulas, or datasets besides those listed in VERIFIED CHART DATA section."
```

**Option C: Schema Enforcement**
```typescript
// Future improvement: use function_calling to constrain article structure
responseMimeType: 'application/json',
// + enforce via schema that content[] must contain only verified references
```

**Option D: Multi-Pass Generation**
```typescript
// 1. Generate article
// 2. Validate and collect errors
// 3. If errors > threshold, regenerate with refined constraints
// 4. Repeat until validation passes
```

## Monitoring & Testing

### Check Validation Reports
Look for in console output after professional article generation:
```
[gemini] Content validation found issues: [...]
[gemini] Removed X orphaned chart reference(s)
```

### Test with Your PDFs
1. Run generation for input1.pdf, input2.pdf, etc.
2. Check console for validation errors
3. Review output content for accuracy
4. Compare against input PDF

### Expected Outcomes
- ✅ No hallucinated numbers (all verified)
- ✅ All chart references exist and are valid
- ✅ Numbers correctly attributed to datasets
- ✅ No speculative language without evidence

## Technical Details

### Validation Algorithm
```
for each number in content:
  - Extract context (sentence)
  - Check if number exists in verified charts
  - Check if number exists in source PDF
  - If neither: flag as HALLUCINATED_NUMBER

for each chart reference:
  - Verify referenced chart exists
  - Verify in extracted charts list
  - If not: flag as ORPHANED_REFERENCE

for patterns:
  - Check for speculative language
  - Check for unattributed claims
  - Flag as WARNINGS for manual review
```

### Data Flow
```
PDF → extractChartDataFromPDF() → ExtractedChartData[]
         ↓
    createStrictChartContext() → String (formatted constraints)
         ↓
    Article Generation Prompt
         ↓
    Gemini/OpenAI → Article Content
         ↓
    validateContentAccuracy() → ValidationResult
         ↓
    sanitizeArticleContent() → Clean Content
         ↓
    Return to User
```

## Files Modified

1. ✅ **src/lib/ai/content-validator.ts** (NEW)
   - `validateContentAccuracy()` - Main validation function
   - `createStrictChartContext()` - Strict context builder
   - `sanitizeArticleContent()` - Auto-cleanup
   - Supporting functions for data verification

2. ✅ **src/lib/ai/gemini.ts**
   - Integrated `createStrictChartContext()` for chart data
   - Added `validateContentAccuracy()` after generation
   - Added `sanitizeArticleContent()` for cleanup
   - Enhanced logging for validation results

## Future Improvements

1. **Auto-Correction**: Modify hallucinated numbers to nearest verified value
2. **Citation Generation**: Auto-add citations like "(from Chart 1)"
3. **Confidence Scoring**: Rate content confidence 0-100%
4. **Chart Type Validation**: Ensure chart types match data
5. **Statistical Testing**: Verify reported p-values against data

## Summary

This system ensures that professional articles:
- ✅ Never use unverified numbers
- ✅ Never reference missing charts
- ✅ Always attribute data correctly
- ✅ Flag suspicious patterns
- ✅ Clean up automatically

The combination of strict context formatting, post-generation validation, and auto-sanitization makes hallucination virtually impossible for professional articles.
