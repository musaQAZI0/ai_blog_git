const fs = require('fs')
const path = require('path')

function loadEnvFromDotEnvLocal() {
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

async function main() {
  const dotEnv = loadEnvFromDotEnvLocal()
  const apiKey = process.env.GEMINI_API_KEY || dotEnv.GEMINI_API_KEY
  const configuredModel =
    process.env.GEMINI_IMAGEN_MODEL ||
    dotEnv.GEMINI_IMAGEN_MODEL ||
    'imagen-4.0-fast-generate-001 (default)'

  console.log('Configured GEMINI_IMAGEN_MODEL:', configuredModel)

  if (!apiKey) {
    console.error('GEMINI_API_KEY is missing (not in process env and not found in .env.local)')
    process.exit(1)
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url)
  const text = await res.text()

  if (!res.ok) {
    console.error('ListModels failed:', res.status)
    console.error(text.slice(0, 1200))
    process.exit(1)
  }

  const json = JSON.parse(text)
  const models = Array.isArray(json.models) ? json.models : []
  const simplified = models.map((m) => ({
    name: m.name,
    displayName: m.displayName,
    supportedGenerationMethods: Array.isArray(m.supportedGenerationMethods)
      ? m.supportedGenerationMethods
      : [],
  }))

  const isImageRelated = (m) => {
    const hay = `${m.name || ''} ${m.displayName || ''}`.toLowerCase()
    return hay.includes('imagen') || hay.includes('image') || hay.includes('nano banana') || hay.includes('nanobanana')
  }

  const imageModels = simplified.filter(isImageRelated)

  console.log(`\nImage-related models found: ${imageModels.length}`)
  for (const m of imageModels) {
    const methods = m.supportedGenerationMethods.length
      ? ` | methods: ${m.supportedGenerationMethods.join(',')}`
      : ''
    const label = m.displayName ? ` | ${m.displayName}` : ''
    console.log(`- ${m.name}${label}${methods}`)
  }

  const likelyImagen = simplified.filter((m) => String(m.name || '').toLowerCase().startsWith('models/imagen'))
  if (likelyImagen.length) {
    console.log(`\nModels starting with "models/imagen": ${likelyImagen.length}`)
    for (const m of likelyImagen) {
      const methods = m.supportedGenerationMethods.length
        ? ` | methods: ${m.supportedGenerationMethods.join(',')}`
        : ''
      const label = m.displayName ? ` | ${m.displayName}` : ''
      console.log(`- ${m.name}${label}${methods}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
