/**
 * Content Validator - Prevents hallucination by validating generated content against source data
 * Ensures all numeric claims and chart references match extracted verified data
 */

import { ExtractedChartData } from '@/lib/charts/data-extractor'

export interface ValidationResult {
    isValid: boolean
    errors: ValidationError[]
    warnings: string[]
    correctedContent?: string
}

export interface ValidationError {
    type: 'hallucinated_number' | 'orphaned_chart_reference' | 'conflicting_data' | 'unverified_claim'
    location: string
    message: string
    suggested_fix?: string
}

interface VerifiedNumber {
    value: number
    context: string
    source: 'chart' | 'metadata'
}

/**
 * Extract all numbers mentioned in content, ignoring URLs and image syntax
 */
function extractNumbersFromContent(content: string): Map<string, string[]> {
    const numberMap = new Map<string, string[]>()

    // Strip markdown image syntax and URLs before scanning — they contain numeric timestamps
    // e.g. ![alt](https://res.cloudinary.com/.../v1778446154/...)
    const stripped = content
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // ![alt](url)
        .replace(/https?:\/\/\S+/g, '')        // bare URLs

    // Pattern: number (integer or decimal) — strip trailing ± to avoid "7.79 ±" being captured as one token
    const numberPattern = /(?:^|[^\d])(-?\d+(?:[.,]\d+)?)/gm
    const matches = stripped.matchAll(numberPattern)

    for (const match of matches)
    {
        const raw = match[1] || ''
        const number = raw.replace(',', '.')
        const parsed = parseFloat(number)

        // Skip unix timestamps and other implausibly large numbers
        if (Math.abs(parsed) > 1_000_000) continue

        if (!numberMap.has(number))
        {
            numberMap.set(number, [])
        }
        // Get surrounding context (50 chars before and after)
        const start = Math.max(0, match.index! - 50)
        const end = Math.min(stripped.length, match.index! + match[0].length + 50)
        const context = stripped.slice(start, end).trim()
        numberMap.get(number)?.push(context)
    }

    return numberMap
}

/**
 * Build verified number map from extracted charts
 */
function buildVerifiedNumberMap(charts: ExtractedChartData[]): Map<string, VerifiedNumber[]> {
    const verifiedNumbers = new Map<string, VerifiedNumber[]>()

    for (const chart of charts)
    {
        // Extract all data values from datasets
        for (const dataset of chart.data.datasets || [])
        {
            for (const value of dataset.data || [])
            {
                if (typeof value === 'number' && Number.isFinite(value))
                {
                    const key = formatNumber(value)
                    const existing = verifiedNumbers.get(key) || []
                    existing.push({
                        value,
                        context: `${chart.chartTitle} - ${dataset.label}`,
                        source: 'chart'
                    })
                    verifiedNumbers.set(key, existing)
                }
            }
        }

        // Extract labels as potential verified strings
        for (const label of chart.data.labels || [])
        {
            if (typeof label === 'string')
            {
                const existing = verifiedNumbers.get(label) || []
                existing.push({
                    value: 0, // placeholder
                    context: `${chart.chartTitle} - axis label`,
                    source: 'metadata'
                })
                verifiedNumbers.set(label, existing)
            }
        }
    }

    return verifiedNumbers
}

/**
 * Normalize number for comparison (handle decimals, percentage formats)
 */
function formatNumber(num: number): string {
    return num.toFixed(4).replace(/\.?0+$/, '')
}

/**
 * Check if a number mentioned in content has a verified source
 */
function isNumberVerified(
    numberStr: string,
    verifiedNumbers: Map<string, VerifiedNumber[]>
): boolean {
    const normalized = formatNumber(parseFloat(numberStr.replace(',', '.')))
    return verifiedNumbers.has(normalized)
}

/**
 * Validate chart placeholder references
 */
function validateChartReferences(
    content: string,
    charts: ExtractedChartData[]
): ValidationError[] {
    const errors: ValidationError[] = []

    // Find all chart references in content
    const chartTokenPattern = /\{\{CHART:([^:]+):([^}]+)\}\}/g
    const placeholderPattern = /https:\/\/www\.google\.com\/search\?q=%7B%7BFIGURE_(\d+)_URL%7D%7D/g

    const referencedCharts = new Set<string>()

    for (const match of content.matchAll(chartTokenPattern))
    {
        referencedCharts.add(match[1])
    }

    for (const match of content.matchAll(placeholderPattern))
    {
        referencedCharts.add(`figure_${match[1]}`)
    }

    // Check if all referenced charts exist
    const availableCharts = new Set(charts.map(c => c.id || `chart_${c.chartTitle}`))

    for (const refChart of referencedCharts)
    {
        if (!availableCharts.has(refChart))
        {
            errors.push({
                type: 'orphaned_chart_reference',
                location: `Chart reference: ${refChart}`,
                message: `Chart "${refChart}" is referenced but not extracted from source document.`,
                suggested_fix: 'Remove the chart reference or ensure the chart exists in the PDF.'
            })
        }
    }

    return errors
}

/**
 * Main validation function
 */
export function validateContentAccuracy(
    content: string,
    charts: ExtractedChartData[],
    sourcePdfContent: string
): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []

    // Build verified data map
    const verifiedNumbers = buildVerifiedNumberMap(charts)
    const contentNumbers = extractNumbersFromContent(content)

    // Check each number in content
    for (const [numberStr, contexts] of contentNumbers)
    {
        if (!isNumberVerified(numberStr, verifiedNumbers))
        {
            // Check both decimal formats against source PDF (e.g. "1.5" matches "1,5" in Polish PDFs)
            const withComma = numberStr.replace('.', ',')
            const withPeriod = numberStr.replace(',', '.')
            const normalizedPdf = sourcePdfContent.replace(/\s+/g, ' ')
            const foundInSource =
                normalizedPdf.includes(numberStr) ||
                normalizedPdf.includes(withComma) ||
                normalizedPdf.includes(withPeriod)

            if (!foundInSource)
            {
                errors.push({
                    type: 'hallucinated_number',
                    location: `Number: ${numberStr}`,
                    message: `The number "${numberStr}" appears in the article but is not found in extracted charts or source document.`,
                    suggested_fix: `Verify this number exists in the source PDF and was captured during chart extraction.`
                })
            }
        }
    }

    // Validate chart references
    const chartErrors = validateChartReferences(content, charts)
    errors.push(...chartErrors)

    // Check for common hallucination patterns
    const halluciantionPatterns = [
        { pattern: /furthermore|additionally|moreover|importantly/, warning: 'Contains connective phrases that might introduce unsupported claims' },
        { pattern: /it is believed|it is thought|it appears that|suggests|implies/, warning: 'Contains speculative language not grounded in data' },
        { pattern: /\d+\s*-\s*\d+\s*%/, warning: 'Contains percentage ranges - verify these match source data' },
        { pattern: /Table\s+\d+|Figure\s+\d+/, warning: 'References tables/figures by number - ensure they exist in source' }
    ]

    for (const { pattern, warning } of halluciantionPatterns)
    {
        if (pattern.test(content))
        {
            warnings.push(warning)
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        correctedContent: content // Could be enhanced to auto-correct
    }
}

/**
 * Creates strict data context for article generation
 * Formats chart data in a way that prevents hallucination
 */
export function createStrictChartContext(charts: ExtractedChartData[]): string {
    if (charts.length === 0) return ''

    const lines: string[] = [
        '\n\n=== VERIFIED CHART DATA FOR ARTICLE GENERATION ===',
        'CRITICAL: ONLY use the exact numbers and labels listed below. DO NOT invent or estimate any values.\n'
    ]

    for (let i = 0; i < charts.length; i++)
    {
        const chart = charts[i]
        lines.push(`\nCHART ${i + 1}: ${chart.chartTitle}`)
        lines.push(`Type: ${chart.chartType}`)
        lines.push(`Verified Source: ${chart.sourceDescription}`)

        // List all labels
        lines.push(`X-Axis/Labels: ${chart.data.labels.join(' | ')}`)

        // List all dataset values
        lines.push('Verified Values:')
        for (const dataset of chart.data.datasets)
        {
            const values = (dataset.data || [])
                .map(v => typeof v === 'number' ? v.toFixed(2) : 'N/A')
                .join(' | ')
            lines.push(`  ${dataset.label}: ${values}`)
        }

        // List metadata
        if (chart.x_axis_label) lines.push(`X-Label: ${chart.x_axis_label}`)
        if (chart.y_axis_label) lines.push(`Y-Label: ${chart.y_axis_label}`)

        lines.push(`Reference Placeholder: ${chart.id || `chart_${i + 1}`}`)
        lines.push('---')
    }

    lines.push(`
CONSTRAINTS FOR ARTICLE WRITER:
1. Only reference these ${charts.length} chart(s) by their verified IDs
2. Only mention the exact numbers shown above
3. Only use the exact labels shown in "X-Axis/Labels"
4. For each dataset value, attribute it to the correct dataset name
5. Do not interpret, estimate, or extrapolate values
6. Do not mention charts that are not listed above
7. If you need to mention a value, cite which dataset it comes from
`)

    return lines.join('\n')
}

/**
 * Post-process article to ensure no orphaned placeholders
 */
export function sanitizeArticleContent(
    content: string,
    extractedCharts: ExtractedChartData[]
): { content: string; removedReferences: string[] } {
    const removedReferences: string[] = []
    let sanitized = content

    // Find and remove orphaned chart references
    const chartIds = new Set(extractedCharts.map(c => c.id || `chart_${c.chartTitle}`))

    // Remove placeholder tokens for non-existent charts
    const orphanedTokens = sanitized.match(/\{\{CHART:[^:]+:[^}]+\}\}/g) || []
    for (const token of orphanedTokens)
    {
        const match = token.match(/\{\{CHART:([^:]+):/)
        const id = match?.[1]
        if (id && !chartIds.has(id))
        {
            sanitized = sanitized.replace(token, '')
            removedReferences.push(token)
        }
    }

    // Clean up excessive whitespace
    sanitized = sanitized
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+\n/g, '\n')
        .trim()

    return { content: sanitized, removedReferences }
}
