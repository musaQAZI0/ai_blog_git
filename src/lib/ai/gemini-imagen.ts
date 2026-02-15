import { generateFileName, uploadFile, uploadFileToProvider, type StorageProvider } from '@/lib/storage'

type ImagenPrediction = {
  bytesBase64Encoded?: string
  mimeType?: string
  image?: {
    bytesBase64Encoded?: string
    mimeType?: string
  }
}

/**
 * Purpose-based model selection:
 *  - cover / illustration → Imagen 4 Ultra (highest quality)
 *  - chart / graph        → Imagen 4 standard (good accuracy, faster)
 *  - fallback             → Imagen 4 Fast
 *
 * The env-var GEMINI_IMAGEN_MODEL always wins when set.
 */
export type ImagenPurpose = 'cover' | 'illustration' | 'chart'

const MODEL_BY_PURPOSE: Record<ImagenPurpose, string> = {
  cover: 'imagen-4.0-ultra-generate-001',
  illustration: 'imagen-4.0-ultra-generate-001',
  chart: 'imagen-4.0-generate-001',
}

const FALLBACK_MODEL = 'imagen-4.0-fast-generate-001'

function getImagenConfig(purpose: ImagenPurpose = 'illustration') {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  // Env-var override takes priority; otherwise pick model by purpose.
  const model = process.env.GEMINI_IMAGEN_MODEL || MODEL_BY_PURPOSE[purpose] || FALLBACK_MODEL
  return { apiKey, model }
}

function extractPrediction(payload: unknown): { bytesB64: string; mimeType: string } {
  const obj = payload as { predictions?: ImagenPrediction[] }
  const prediction = obj?.predictions?.[0]

  const bytesB64 =
    prediction?.bytesBase64Encoded ||
    prediction?.image?.bytesBase64Encoded ||
    ''

  const mimeType =
    prediction?.mimeType ||
    prediction?.image?.mimeType ||
    'image/png'

  if (!bytesB64) {
    throw new Error('Gemini image generation returned no image bytes')
  }

  return { bytesB64, mimeType }
}

function extensionFromMime(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/png') return 'png'
  return 'png'
}

export async function generateImagenBuffer(
  prompt: string,
  purpose: ImagenPurpose = 'illustration'
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { apiKey, model } = getImagenConfig(purpose)

  console.log(`[imagen] Generating image with model "${model}" (purpose: ${purpose})`)

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
      throw new Error(
        `Gemini image generation failed (${response.status}): ${text || response.statusText}`
      )
    }

    const json = (await response.json()) as unknown
    const { bytesB64, mimeType } = extractPrediction(json)
    return { buffer: Buffer.from(bytesB64, 'base64'), mimeType }
  }

  try {
    return await tryPredict(model)
  } catch (error) {
    // If the chosen model is unavailable, retry with the fast fallback.
    if (model !== FALLBACK_MODEL) {
      console.warn(
        `[imagen] Model "${model}" failed. Retrying with fallback "${FALLBACK_MODEL}".`
      )
      return tryPredict(FALLBACK_MODEL)
    }
    throw error
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
