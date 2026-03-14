# Chart Generation System

This module provides accurate data visualization for professional medical articles using Chart.js instead of AI image generation.

## Overview

The chart generation system extracts numerical data from PDF documents and generates accurate bar charts, line graphs, and scatter plots using Chart.js. This ensures 100% accuracy of data labels and values, eliminating the problem of AI-generated images with made-up or gibberish text.

## Architecture

### 1. Data Extraction (`data-extractor.ts`)
- Uses OpenAI (GPT-4o by default) to extract structured numerical data from PDF content
- Identifies tables, statistical results, and comparison data
- Returns structured data suitable for Chart.js (labels, datasets, values)
- Validates extracted data to prevent AI hallucination
- Charts are numbered sequentially in the article (Rysunek 1, Rysunek 2, Rysunek 3) regardless of source table numbers
- All chart titles and labels are generated in Polish for professional articles

### 2. Chart Generation (`chart-generator.ts`)
- Uses Chart.js and chartjs-node-canvas for server-side chart rendering
- Generates PNG images from chart data
- Supports bar charts, line graphs, and scatter plots
- Configurable chart options (title, dimensions, colors)

### 3. Chart Upload (`chart-uploader.ts`)
- Uploads generated chart images to Cloudinary or local storage
- Integrates data extraction and chart generation
- Returns public URLs for use in article content

## Usage

### In AI Article Generation

The chart generation is automatically integrated into all AI providers:
- **OpenAI** ([openai.ts](../ai/openai.ts))
- **Gemini** ([gemini.ts](../ai/gemini.ts))
- **Claude** ([claude.ts](../ai/claude.ts))

For **professional articles**, the system:
1. Extracts chart data from the PDF
2. Generates charts using Chart.js
3. Uploads charts to storage
4. Injects chart URLs into article content

For **patient articles**, the system:
- Uses AI image generation (Gemini Imagen) for clean anatomical illustrations
- NO text, labels, or data on patient images

### Example Flow

```typescript
// Automatic flow in article generation
if (targetAudience === 'professional') {
  const generatedCharts = await extractGenerateAndUploadCharts(pdfContent, 3)
  // Charts are automatically injected into content
}
```

### Manual Usage

```typescript
import { extractGenerateAndUploadCharts } from '@/lib/charts/chart-uploader'

// Extract data, generate charts, and upload
const charts = await extractGenerateAndUploadCharts(pdfContent, maxCharts)

// Each chart includes:
// - id: unique identifier
// - url: public URL of uploaded chart
// - title: chart title
// - alt: alt text for accessibility
// - caption: source description
// - placeholder: placeholder URL to replace in content
```

## Chart Data Structure

```typescript
interface ChartData {
  labels: string[]              // X-axis labels
  datasets: {
    label: string              // Dataset name
    data: number[]             // Y-axis values (must be real numbers from PDF)
    backgroundColor?: string   // Bar/point colors
    borderColor?: string       // Border colors
    borderWidth?: number       // Border width
  }[]
}
```

## Key Features

✅ **100% Accurate Data**: Uses exact values from PDF, no AI hallucination
✅ **Professional Charts**: Clean, publication-quality bar charts and graphs
✅ **Real Data Labels**: Only includes text/labels that exist in source document
✅ **Client Preference**: Prioritizes bar charts (most preferred format)
✅ **Automatic Integration**: Works seamlessly with all AI providers
✅ **Fallback Safety**: Gracefully handles cases where no chart data is found

## Dependencies

- `chart.js`: Chart rendering library
- `chartjs-node-canvas`: Server-side Canvas implementation for Node.js

## Configuration

Environment variables used:
- `OPENAI_API_KEY`: For data extraction with OpenAI (required)
- `CHART_EXTRACTION_MODEL`: OpenAI model to use (default: `gpt-4o`)
  - Recommended chat models: `gpt-4o` (fast, accurate), `o1` or `o1-pro` (reasoning)
  - Note: GPT-5.x-pro models use legacy completions API, not supported yet
- `AI_STORAGE_PROVIDER`: For chart image upload (Cloudinary or local)

## Example Output

For a professional article about IOL formulas:

**Input PDF Data**:
```
Formula    | Mean Error | SD
-----------|-----------|----
Cooke K6   | 0.12 D    | 0.34 D
Barrett II | 0.08 D    | 0.28 D
Kane       | 0.15 D    | 0.32 D
```

**Generated Chart**:
- Type: Bar chart
- X-axis: ["Cooke K6", "Barrett II", "Kane"]
- Y-axis: [0.34, 0.28, 0.32]
- Title: "Porównanie odchylenia standardowego dla formuł IOL"
- Dataset Label: "Odchylenie standardowe (D)"
- Caption: "Rysunek 1: Porównanie odchylenia standardowego dla formuł IOL"

## Differences from AI Image Generation

| Aspect | AI Image Gen (Old) | Chart.js (New) |
|--------|-------------------|----------------|
| Data accuracy | ❌ Made-up values | ✅ Exact PDF values |
| Text/labels | ❌ Gibberish text | ✅ Real labels only |
| Chart type | ❌ Infographics + extras | ✅ Clean bar/line charts |
| Reliability | ❌ Unpredictable | ✅ 100% consistent |
| Use case | Patient illustrations | Professional data viz |

## Future Enhancements

- Support for more chart types (pie charts, area charts)
- Custom color schemes based on article category
- Interactive charts (if client-side rendering is needed)
- Multi-dataset comparison charts
- Error bars for statistical data
