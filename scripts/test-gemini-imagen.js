#!/usr/bin/env node

/**
 * Test Gemini Imagen + (optional) Cloudinary upload using local env.
 *
 * Usage:
 *   node scripts/test-gemini-imagen.js
 *
 * Notes:
 * - Reads `.env.local` (and `.env`) similarly to scripts/verify-env.js (no dotenv dependency).
 * - Does NOT print your API keys.
 */

const fs = require('fs')
const path = require('path')

const envFiles = ['.env.local', '.env', path.join('src', '.env')]

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const contents = fs.readFileSync(filePath, 'utf8')
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const exportPrefix = 'export '
    const normalized = trimmed.startsWith(exportPrefix)
      ? trimmed.slice(exportPrefix.length)
      : trimmed

    const equalsIndex = normalized.indexOf('=')
    if (equalsIndex === -1) return

    const key = normalized.slice(0, equalsIndex).trim()
    let value = normalized.slice(equalsIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  })
}

envFiles.forEach((file) => loadEnvFile(path.resolve(process.cwd(), file)))

async function main() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in your env (.env.local)')
  }

  const listModels = async () => {
    console.log('[gemini] listing available models for this API key...')
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    )
    const text = await res.text().catch(() => '')
    if (!res.ok) {
      throw new Error(`[gemini] list models failed (${res.status}): ${text || res.statusText}`)
    }
    const json = JSON.parse(text)
    const models = Array.isArray(json?.models) ? json.models : []
    for (const m of models) {
      const name = m?.name || ''
      const methods = Array.isArray(m?.supportedGenerationMethods)
        ? m.supportedGenerationMethods.join(',')
        : ''
      console.log(`- ${name}${methods ? ` (${methods})` : ''}`)
    }
  }

  if (process.env.GEMINI_LIST_MODELS === '1') {
    await listModels()
    return
  }

  const model = process.env.GEMINI_IMAGEN_MODEL || 'imagen-4.0-fast-generate-001'

  const prompt =
    process.env.GEMINI_TEST_PROMPT ||
    'Professional medical illustration thumbnail about intraocular lens (IOL) power calculation. Square 1:1 composition. Clean, modern medical aesthetic. No text.'

  console.log(`[gemini] model: ${model}`)
  console.log('[gemini] generating image...')

  const predictOnce = async (modelName) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`[gemini] failed (${res.status}): ${text || res.statusText}`)
    }

    const json = await res.json()
    const prediction = json?.predictions?.[0] || {}
    const bytesB64 =
      prediction?.bytesBase64Encoded ||
      prediction?.image?.bytesBase64Encoded ||
      ''
    const mimeType =
      prediction?.mimeType ||
      prediction?.image?.mimeType ||
      'image/png'
    return { bytesB64, mimeType }
  }

  let bytesB64 = ''
  let mimeType = 'image/png'

  try {
    ;({ bytesB64, mimeType } = await predictOnce(model))
  } catch (err) {
    console.error('[gemini] generation failed with configured model. Available models for your key:')
    await listModels()

    const fallbackModel = 'imagen-4.0-fast-generate-001'
    if (model !== fallbackModel) {
      console.log(`[gemini] retrying with fallback model: ${fallbackModel}`)
      ;({ bytesB64, mimeType } = await predictOnce(fallbackModel))
    } else {
      throw err
    }
  }

  if (!bytesB64) {
    throw new Error('[gemini] response ok but no image bytes returned')
  }

  const buffer = Buffer.from(bytesB64, 'base64')
  const ext =
    mimeType === 'image/jpeg'
      ? 'jpg'
      : mimeType === 'image/webp'
      ? 'webp'
      : 'png'

  const outDir = path.resolve(process.cwd(), 'tmp')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `gemini-imagen-test.${ext}`)
  fs.writeFileSync(outPath, buffer)

  console.log(`[gemini] ok (${mimeType}), wrote: ${outPath}`)

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const cloudKey = process.env.CLOUDINARY_API_KEY
  const cloudSecret = process.env.CLOUDINARY_API_SECRET

  if (cloudName && cloudKey && cloudSecret) {
    console.log('[cloudinary] uploading test image...')
    const { v2: cloudinary } = require('cloudinary')

    cloudinary.config({
      cloud_name: cloudName,
      api_key: cloudKey,
      api_secret: cloudSecret,
    })

    const dataUri = `data:${mimeType};base64,${bytesB64}`
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      resource_type: 'image',
      folder: 'medical-blog/ai-tests',
      public_id: `gemini-imagen-test-${Date.now()}`,
      overwrite: false,
    })

    console.log('[cloudinary] ok, secure_url:')
    console.log(uploadResult.secure_url)
  } else {
    console.log('[cloudinary] skipped (missing Cloudinary env vars)')
  }
}

main().catch((err) => {
  console.error(err?.stack || err)
  process.exit(1)
})
