import { generateFileName, uploadFile, uploadFileToProvider, type StorageProvider } from '@/lib/storage'

type ImagenPrediction = {
  bytesBase64Encoded?: string
  mimeType?: string
  image?: {
    bytesBase64Encoded?: string
    mimeType?: string
  }
}

function getImagenConfig() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  // Use a model that exists for most keys (Imagen 4, per ListModels).
  const model = process.env.GEMINI_IMAGEN_MODEL || 'imagen-4.0-fast-generate-001'
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

export async function generateImagenBuffer(prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const { apiKey, model } = getImagenConfig()

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
    // If user configured an unavailable model (common: imagen-3.*), retry with a known-good fallback.
    const fallbackModel = 'imagen-4.0-fast-generate-001'
    if (model !== fallbackModel) {
      console.warn(
        `Gemini model "${model}" failed. Retrying with "${fallbackModel}".`
      )
      return tryPredict(fallbackModel)
    }
    throw error
  }
}

export async function generateAndUploadImagen(
  prompt: string,
  originalName: string,
  folderPrefix: string = 'ai'
): Promise<string> {
  const { buffer, mimeType } = await generateImagenBuffer(prompt)
  const ext = extensionFromMime(mimeType)
  const fileName = generateFileName(`${originalName}.${ext}`, folderPrefix)

  const provider = process.env.AI_STORAGE_PROVIDER as StorageProvider | undefined
  if (provider) {
    return uploadFileToProvider(provider, buffer, fileName, mimeType)
  }

  return uploadFile(buffer, fileName, mimeType)
}
