import { uploadToS3, deleteFromS3 } from './s3'
import { uploadToAzure, deleteFromAzure } from './azure'
import { uploadToFirebase, deleteFromFirebase } from './firebase'
import { uploadToMongoDB, deleteFromMongoDB, getMongoDBDownloadURL } from './mongodb'
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinary'

export type StorageProvider = 'local' | 's3' | 'azure' | 'firebase' | 'mongodb' | 'cloudinary'

const STORAGE_PROVIDER = (process.env.STORAGE_PROVIDER || 'cloudinary') as StorageProvider

/**
 * Upload file to configured storage provider
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  switch (STORAGE_PROVIDER) {
    case 'cloudinary':
      // Cloudinary with automatic optimization
      return uploadToCloudinary(file, fileName, contentType)
    case 'mongodb':
      // MongoDB returns file ID, convert to download URL
      const fileId = await uploadToMongoDB(file, fileName, contentType)
      return getMongoDBDownloadURL(fileId)
    case 'firebase':
      return uploadToFirebase(file, fileName, contentType)
    case 's3':
      return uploadToS3(file, fileName, contentType)
    case 'azure':
      return uploadToAzure(file, fileName, contentType)
    case 'local':
    default:
      // For local storage, you'd save to public folder
      // This is a simplified implementation
      console.warn('Local storage not recommended for production')
      return `/uploads/${fileName}`
  }
}

/**
 * Delete file from configured storage provider
 */
export async function deleteFile(fileName: string): Promise<void> {
  switch (STORAGE_PROVIDER) {
    case 'cloudinary':
      return deleteFromCloudinary(fileName)
    case 'mongodb':
      // Extract file ID from URL if needed (/api/files/[id])
      const fileId = fileName.includes('/api/files/')
        ? fileName.split('/api/files/')[1]
        : fileName
      return deleteFromMongoDB(fileId)
    case 'firebase':
      return deleteFromFirebase(fileName)
    case 's3':
      return deleteFromS3(fileName)
    case 'azure':
      return deleteFromAzure(fileName)
    case 'local':
    default:
      // For local storage, delete from public folder
      console.warn('Local storage deletion not implemented')
  }
}

/**
 * Generate unique file name
 */
export function generateFileName(originalName: string, prefix: string = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()
  const cleanName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase()
    .substring(0, 30)

  return `${prefix}${prefix ? '-' : ''}${cleanName}-${timestamp}-${random}.${extension}`
}

/**
 * Validate file type
 */
export function validateFileType(
  fileName: string,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  const extension = fileName.split('.').pop()?.toLowerCase()

  if (!extension || !allowedTypes.includes(extension)) {
    return {
      valid: false,
      error: `File type .${extension} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Validate file size
 */
export function validateFileSize(
  fileSize: number,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  if (fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
    }
  }

  return { valid: true }
}

/**
 * Scan file for viruses (placeholder - integrate with ClamAV or similar)
 */
export async function scanFileForViruses(file: Buffer): Promise<boolean> {
  // This would integrate with a virus scanning service
  // For now, just return true
  console.log('Virus scanning requires integration with ClamAV or similar service')
  return true
}
