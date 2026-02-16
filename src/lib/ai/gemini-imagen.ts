import { generateFileName, uploadFile, uploadFileToProvider, type StorageProvider } from '@/lib/storage'

export type ImagenPurpose = 'cover' | 'illustration' | 'chart'

// ---------------------------------------------------------------------------
// Nano Banana Pro  –  primary image generator
// Uses the Gemini generateContent API with responseModalities: ["IMAGE"]
// ---------------------------------------------------------------------------
const NANO_BANANA_MODEL = 'gemini-3-pro-image-preview'
const NANO_BANANA_FLASH_MODEL = 'gemini-2.5-flash-image'

// ---------------------------------------------------------------------------
// Imagen  –  fallback image generator (predict API)
// ---------------------------------------------------------------------------
const IMAGEN_MODEL_BY_PURPOSE: Record<ImagenPurpose, string> = {
  cover: 'imagen-4.0-ultra-generate-001',
  illustration: 'imagen-4.0-ultra-generate-001',
  chart: 'imagen-4.0-generate-001',
}
const IMAGEN_FALLBACK = 'imagen-4.0-fast-generate-001'

// ---------------------------------------------------------------------------
// Nano Banana response types
// ---------------------------------------------------------------------------
type NanaBananaPart = {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
}

type NanaBananaResponse = {
  candidates?: Array<{
    content?: {
      parts?: NanaBananaPart[]
    }
  }>
  error?: { message: string }
}

// ---------------------------------------------------------------------------
// Imagen response types
// ---------------------------------------------------------------------------
type ImagenPrediction = {
  bytesBase64Encoded?: string
  mimeType?: string
  image?: {
    bytesBase64Encoded?: string
    mimeType?: string
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  return apiKey
}

function extensionFromMime(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/png') return 'png'
  return 'png'
}

// ---------------------------------------------------------------------------
// 1) Nano Banana Pro  –  generateContent API
// ---------------------------------------------------------------------------
async function generateWithNanaBanana(
  prompt: string,
  model: string = NANO_BANANA_MODEL
): Promise<{ buffer: Buffer; mimeType: string }> {
  const apiKey = getApiKey()

  console.log(`[nano-banana] Generating image with model "${model}"`)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Nano Banana generation failed (${response.status}): ${text || response.statusText}`)
  }

  const json = (await response.json()) as NanaBananaResponse

  if (json.error) {
    throw new Error(`Nano Banana API error: ${json.error.message}`)
  }

  const parts = json.candidates?.[0]?.content?.parts
  if (!parts) throw new Error('Nano Banana returned no parts')

  // Find the image part
  const imagePart = parts.find((p) => p.inlineData?.data)
  if (!imagePart?.inlineData) {
    throw new Error('Nano Banana returned no image data')
  }

  console.log(`[nano-banana] Image generated successfully with "${model}"`)

  return {
    buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  }
}

// ---------------------------------------------------------------------------
// 2) Imagen  –  predict API (fallback)
// ---------------------------------------------------------------------------
async function generateWithImagen(
  prompt: string,
  purpose: ImagenPurpose = 'illustration'
): Promise<{ buffer: Buffer; mimeType: string }> {
  const apiKey = getApiKey()
  const model = IMAGEN_MODEL_BY_PURPOSE[purpose] || IMAGEN_FALLBACK

  console.log(`[imagen-fallback] Generating image with model "${model}" (purpose: ${purpose})`)

  const tryPredict = async (modelName: string) => {
    const response = await fetch(
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

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Imagen generation failed (${response.status}): ${text || response.statusText}`)
    }

    const json = (await response.json()) as { predictions?: ImagenPrediction[] }
    const prediction = json?.predictions?.[0]
    const bytesB64 = prediction?.bytesBase64Encoded || prediction?.image?.bytesBase64Encoded || ''
    const mimeType = prediction?.mimeType || prediction?.image?.mimeType || 'image/png'

    if (!bytesB64) throw new Error('Imagen returned no image bytes')

    return { buffer: Buffer.from(bytesB64, 'base64'), mimeType }
  }

  try {
    return await tryPredict(model)
  } catch (error) {
    if (model !== IMAGEN_FALLBACK) {
      console.warn(`[imagen-fallback] Model "${model}" failed. Retrying with "${IMAGEN_FALLBACK}".`)
      return tryPredict(IMAGEN_FALLBACK)
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Public API  –  Nano Banana Pro → Nano Banana Flash → Imagen fallback
// ---------------------------------------------------------------------------
export async function generateImagenBuffer(
  prompt: string,
  purpose: ImagenPurpose = 'illustration'
): Promise<{ buffer: Buffer; mimeType: string }> {
  // Allow env-var override to force a specific model/engine
  const override = process.env.GEMINI_IMAGEN_MODEL
  if (override) {
    console.log(`[image-gen] Using env override model: "${override}"`)
    // If override looks like a Nano Banana model, use generateContent API
    if (override.includes('flash-image') || override.includes('pro-image') || override.includes('nano-banana')) {
      return generateWithNanaBanana(prompt, override)
    }
    // Otherwise treat it as an Imagen model
    return generateWithImagen(prompt, purpose)
  }

  // Default flow: Nano Banana Pro → Flash fallback → Imagen fallback
  try {
    return await generateWithNanaBanana(prompt, NANO_BANANA_MODEL)
  } catch (err) {
    console.warn(`[image-gen] Nano Banana Pro failed: ${err instanceof Error ? err.message : err}`)
    console.warn(`[image-gen] Trying Nano Banana Flash...`)

    try {
      return await generateWithNanaBanana(prompt, NANO_BANANA_FLASH_MODEL)
    } catch (err2) {
      console.warn(`[image-gen] Nano Banana Flash failed: ${err2 instanceof Error ? err2.message : err2}`)
      console.warn(`[image-gen] Falling back to Imagen...`)
      return generateWithImagen(prompt, purpose)
    }
  }
}

export async function generateAndUploadImagen(
  prompt: string,
  originalName: string,
  folderPrefix: string = 'ai',
  purpose: ImagenPurpose = 'illustration'
): Promise<string> {
  const { buffer, mimeType } = await generateImagenBuffer(prompt, purpose)
  const ext = extensionFromMime(mimeType)
  const fileName = generateFileName(`${originalName}.${ext}`, folderPrefix)

  const provider = process.env.AI_STORAGE_PROVIDER as StorageProvider | undefined
  if (provider) {
    return uploadFileToProvider(provider, buffer, fileName, mimeType)
  }

  return uploadFile(buffer, fileName, mimeType)
}
