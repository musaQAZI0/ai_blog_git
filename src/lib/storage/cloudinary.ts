/**
 * Cloudinary Storage Integration
 * Uses Cloudinary for image uploads with automatic optimization
 *
 * Cloudinary Free Tier: 25 GB storage, 25 GB bandwidth/month, no credit card required
 */

import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

/**
 * Upload file to Cloudinary
 * ⚡ OPTIMIZATION: Uses upload_stream to avoid base64 encoding overhead
 */
export async function uploadToCloudinary(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'medical-blog'
): Promise<string> {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured in environment variables')
  }

  try {
    // Determine resource type based on content type
    const resourceType = contentType.startsWith('video/')
      ? 'video'
      : contentType === 'application/pdf'
      ? 'raw'
      : 'image'

    // ⚡ OPTIMIZATION: Use upload_stream instead of base64 encoding
    // This reduces memory usage by ~30% (no base64 conversion needed)
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: folder,
          public_id: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
          overwrite: false,
          // For images, apply automatic optimizations
          ...(resourceType === 'image' && {
            transformation: [
              { quality: 'auto', fetch_format: 'auto' }, // Auto quality and format
            ],
          }),
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error)
            reject(new Error('Failed to upload file to Cloudinary'))
          } else if (result) {
            resolve(result.secure_url)
          } else {
            reject(new Error('No result from Cloudinary upload'))
          }
        }
      )

      // Write buffer to stream
      uploadStream.end(file)
    })
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload file to Cloudinary')
  }
}

/**
 * Upload image to Cloudinary with specific transformations
 * ⚡ OPTIMIZATION: Uses upload_stream to avoid base64 encoding overhead
 */
export async function uploadImageToCloudinary(
  file: Buffer,
  fileName: string,
  options?: {
    folder?: string
    width?: number
    height?: number
    crop?: string
  }
): Promise<string> {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured')
  }

  try {
    // ⚡ OPTIMIZATION: Use upload_stream instead of base64 encoding
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: options?.folder || 'medical-blog/images',
          public_id: fileName.replace(/\.[^/.]+$/, ''),
          overwrite: false,
          transformation: [
            {
              quality: 'auto',
              fetch_format: 'auto',
              ...(options?.width && { width: options.width }),
              ...(options?.height && { height: options.height }),
              ...(options?.crop && { crop: options.crop }),
            },
          ],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary image upload error:', error)
            reject(new Error('Failed to upload image to Cloudinary'))
          } else if (result) {
            resolve(result.secure_url)
          } else {
            reject(new Error('No result from Cloudinary upload'))
          }
        }
      )

      // Write buffer to stream
      uploadStream.end(file)
    })
  } catch (error) {
    console.error('Cloudinary image upload error:', error)
    throw new Error('Failed to upload image to Cloudinary')
  }
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured')
  }

  try {
    // Extract public ID from URL if full URL is provided
    let cleanPublicId = publicId

    if (publicId.includes('cloudinary.com')) {
      // Extract public ID from Cloudinary URL
      const urlParts = publicId.split('/')
      const uploadIndex = urlParts.findIndex(part => part === 'upload')
      if (uploadIndex !== -1) {
        cleanPublicId = urlParts.slice(uploadIndex + 2).join('/')
        // Remove extension
        cleanPublicId = cleanPublicId.replace(/\.[^/.]+$/, '')
      }
    }

    await cloudinary.uploader.destroy(cleanPublicId)
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw new Error('Failed to delete file from Cloudinary')
  }
}

/**
 * Get optimized image URL from Cloudinary
 */
export function getCloudinaryImageUrl(
  publicId: string,
  options?: {
    width?: number
    height?: number
    crop?: string
    quality?: string | number
    format?: string
  }
): string {
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary cloud name not configured')
  }

  const transformations = []

  if (options?.width || options?.height || options?.crop) {
    transformations.push(
      `${options.crop || 'fill'},` +
      `${options.width ? `w_${options.width}` : ''}` +
      `${options.height ? `,h_${options.height}` : ''}`
    )
  }

  if (options?.quality) {
    transformations.push(`q_${options.quality}`)
  }

  if (options?.format) {
    transformations.push(`f_${options.format}`)
  } else {
    transformations.push('f_auto') // Auto format
  }

  const transformString = transformations.length > 0
    ? transformations.join(',') + '/'
    : ''

  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}${publicId}`
}

/**
 * Generate responsive image URLs
 */
export function getResponsiveImageUrls(publicId: string): {
  thumbnail: string
  medium: string
  large: string
  original: string
} {
  return {
    thumbnail: getCloudinaryImageUrl(publicId, { width: 300, height: 300, crop: 'fill' }),
    medium: getCloudinaryImageUrl(publicId, { width: 800, crop: 'scale' }),
    large: getCloudinaryImageUrl(publicId, { width: 1200, crop: 'scale' }),
    original: getCloudinaryImageUrl(publicId, {}),
  }
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return isConfigured
}
