const fs = require('fs')
const path = require('path')

function loadEnv() {
    const filePath = path.join(process.cwd(), '.env.local')
    if (!fs.existsSync(filePath)) return {}
    const content = fs.readFileSync(filePath, 'utf8')
    const out = {}
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const idx = line.indexOf('=')
        if (idx <= 0) continue
        const key = line.slice(0, idx).trim()
        let value = line.slice(idx + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        out[key] = value
    }
    return out
}

const MODELS_TO_TEST = [
    'imagen-4.0-fast-generate-001',
    'imagen-4.0-generate-001',
    'imagen-4.0-ultra-generate-001',
]

const TEST_PROMPT = 'A clean, professional medical illustration of a healthy human eye in cross-section. Modern aesthetic, no text.'

async function testModel(apiKey, modelName) {
    const start = Date.now()
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict`,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: JSON.stringify({
                    instances: [{ prompt: TEST_PROMPT }],
                    parameters: { sampleCount: 1 },
                }),
            }
        )

        const elapsed = ((Date.now() - start) / 1000).toFixed(1)

        if (!response.ok) {
            const text = await response.text().catch(() => '')
            const errorSnippet = text.slice(0, 200)
            return { model: modelName, status: 'FAILED', elapsed: `${elapsed}s`, error: `HTTP ${response.status}: ${errorSnippet}` }
        }

        const json = await response.json()
        const prediction = json?.predictions?.[0]
        const bytesB64 = prediction?.bytesBase64Encoded || prediction?.image?.bytesBase64Encoded || ''
        const mimeType = prediction?.mimeType || prediction?.image?.mimeType || 'unknown'
        const sizeKB = bytesB64 ? Math.round((bytesB64.length * 3) / 4 / 1024) : 0

        if (!bytesB64) {
            return { model: modelName, status: 'FAILED', elapsed: `${elapsed}s`, error: 'No image bytes returned' }
        }

        return {
            model: modelName,
            status: 'OK',
            elapsed: `${elapsed}s`,
            mimeType,
            sizeKB: `${sizeKB} KB`,
        }
    } catch (err) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        return { model: modelName, status: 'FAILED', elapsed: `${elapsed}s`, error: err.message }
    }
}

async function main() {
    const env = loadEnv()
    const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY
    const configuredModel = process.env.GEMINI_IMAGEN_MODEL || env.GEMINI_IMAGEN_MODEL || '(not set, default: imagen-4.0-fast-generate-001)'

    if (!apiKey) {
        console.error('GEMINI_API_KEY not found')
        process.exit(1)
    }

    console.log(`Configured GEMINI_IMAGEN_MODEL: ${configuredModel}`)
    console.log(`Testing ${MODELS_TO_TEST.length} models with prompt: "${TEST_PROMPT.slice(0, 60)}..."`)
    console.log('---')

    for (const model of MODELS_TO_TEST) {
        console.log(`Testing: ${model} ...`)
        const result = await testModel(apiKey, model)
        if (result.status === 'OK') {
            console.log(`  ✅ ${result.model} — ${result.status} | ${result.elapsed} | ${result.mimeType} | ${result.sizeKB}`)
        } else {
            console.log(`  ❌ ${result.model} — ${result.status} | ${result.elapsed} | ${result.error}`)
        }
    }

    console.log('\n--- Summary ---')
    console.log('The model configured in .env.local should match one of the working models above.')
}

main().catch((err) => { console.error(err); process.exit(1) })
