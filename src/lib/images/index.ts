import sharp from 'sharp'
import { generateAndUploadImagen } from '@/lib/ai/gemini-imagen'

/**
 * Generate medical illustration/thumbnail using Gemini Imagen
 */
export async function generateMedicalImage(
  title: string,
  context?: string,
  style: 'illustration' | 'diagram' | 'photo' = 'illustration'
): Promise<string | null> {
  const stylePrompts = {
    illustration:
      'Professional medical illustration, clean and modern design, educational, medical aesthetic',
    diagram:
      'Medical diagram or infographic, clear and simple, educational labels, professional medical style',
    photo: 'Professional medical photography style, clean background, medical setting, high quality',
  }

  const basePrompt = `${stylePrompts[style]} for an ophthalmology or medical article about "${title}"`
  const fullPrompt = context ? `${basePrompt}. ${context}` : basePrompt
  const finalPrompt =
    `${fullPrompt}. ` +
    `Thumbnail image, square 1:1 composition, centered subject, high contrast, clean background. ` +
    `No text, watermarks, or logos in the image. Medical and professional appearance.`

  try {
    const imageUrl = await generateAndUploadImagen(finalPrompt, title, 'ai-thumbnail')
    return imageUrl
  } catch (error) {
    console.error('Gemini image generation failed:', error)
    return null
  }
}

/**
 * Process and optimize image
 * Requires 'sharp' package: npm install sharp
 */
export async function processImage(
  imageBuffer: Buffer,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'jpeg' | 'png' | 'webp'
    watermark?: string
  } = {}
): Promise<Buffer> {
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    watermark,
  } = options

  let image = sharp(imageBuffer)

  // Resize if dimensions provided
  if (width || height) {
    image = image.resize(width, height, {
      fit: 'cover',
      position: 'center',
    })
  }

  // Add watermark if provided
  if (watermark) {
    // This would require a watermark image file
    // For now, we'll skip watermark implementation
    console.log('Watermark feature requires implementation')
  }

  // Convert to specified format
  if (format === 'jpeg') {
    image = image.jpeg({ quality })
  } else if (format === 'png') {
    image = image.png({ quality })
  } else if (format === 'webp') {
    image = image.webp({ quality })
  }

  return image.toBuffer()
}

/**
 * Generate multiple image sizes for responsive design
 */
export async function generateResponsiveImages(
  imageBuffer: Buffer
): Promise<{
  thumbnail: Buffer
  medium: Buffer
  large: Buffer
}> {
  const [thumbnail, medium, large] = await Promise.all([
    processImage(imageBuffer, { width: 400, height: 300, quality: 70 }),
    processImage(imageBuffer, { width: 800, height: 600, quality: 80 }),
    processImage(imageBuffer, { width: 1200, height: 900, quality: 85 }),
  ])

  return { thumbnail, medium, large }
}

/**
 * Download image from URL
 */
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Generate image from DALL-E and process it
 */
export async function generateAndProcessImage(
  title: string,
  context?: string,
  style?: 'illustration' | 'diagram' | 'photo'
): Promise<{
  original: string
  processed?: {
    thumbnail: Buffer
    medium: Buffer
    large: Buffer
  }
} | null> {
  const imageUrl = await generateMedicalImage(title, context, style)

  if (!imageUrl) {
    return null
  }

  try {
    // Download the generated image
    const imageBuffer = await downloadImage(imageUrl)

    // Generate responsive versions
    const processedImages = await generateResponsiveImages(imageBuffer)

    return {
      original: imageUrl,
      processed: processedImages,
    }
  } catch (error) {
    console.error('Image processing failed:', error)
    // Return original URL even if processing fails
    return {
      original: imageUrl,
    }
  }
}

/**
 * Extract image dimensions
 */
export async function getImageDimensions(
  imageBuffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata()
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  }
}

/**
 * Add text watermark to image
 */
export async function addTextWatermark(
  imageBuffer: Buffer,
  text: string,
  position: 'bottom-right' | 'bottom-left' | 'center' = 'bottom-right'
): Promise<Buffer> {
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions')
  }

  // Create SVG watermark
  const fontSize = Math.floor(metadata.width * 0.03)
  let x, y

  switch (position) {
    case 'bottom-right':
      x = metadata.width - 20
      y = metadata.height - 20
      break
    case 'bottom-left':
      x = 20
      y = metadata.height - 20
      break
    case 'center':
      x = metadata.width / 2
      y = metadata.height / 2
      break
  }

  const svgWatermark = `
    <svg width="${metadata.width}" height="${metadata.height}">
      <text
        x="${x}"
        y="${y}"
        font-family="Arial"
        font-size="${fontSize}"
        fill="white"
        fill-opacity="0.5"
        text-anchor="${position === 'bottom-right' ? 'end' : position === 'bottom-left' ? 'start' : 'middle'}"
      >${text}</text>
    </svg>
  `

  return image
    .composite([
      {
        input: Buffer.from(svgWatermark),
        gravity: position === 'center' ? 'center' : 'southeast',
      },
    ])
    .toBuffer()
}
