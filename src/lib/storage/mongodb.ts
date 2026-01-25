/**
 * MongoDB GridFS Storage Integration
 * Uses MongoDB GridFS for file uploads (free alternative to Firebase Storage)
 *
 * MongoDB Atlas Free Tier: 512 MB storage, no credit card required
 */

import { MongoClient, GridFSBucket, ObjectId } from 'mongodb'
import { Readable } from 'stream'

let client: MongoClient | null = null
let gridFSBucket: GridFSBucket | null = null

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'medical-blog'

/**
 * Connect to MongoDB and initialize GridFS
 */
async function getGridFSBucket(): Promise<GridFSBucket> {
  if (gridFSBucket) {
    return gridFSBucket
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured in environment variables')
  }

  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(MONGODB_DB_NAME)
    gridFSBucket = new GridFSBucket(db, {
      bucketName: 'uploads', // Collection name will be 'uploads.files' and 'uploads.chunks'
    })

    console.log('MongoDB GridFS connected successfully')
    return gridFSBucket
  } catch (error) {
    console.error('MongoDB GridFS connection error:', error)
    throw new Error('Failed to connect to MongoDB GridFS')
  }
}

/**
 * Upload file to MongoDB GridFS
 */
export async function uploadToMongoDB(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'uploads'
): Promise<string> {
  try {
    const bucket = await getGridFSBucket()

    // Create a readable stream from buffer
    const readableStream = Readable.from(file)

    // Upload to GridFS with metadata
    const uploadStream = bucket.openUploadStream(fileName, {
      contentType,
      metadata: {
        folder,
        originalName: fileName,
        uploadedAt: new Date(),
        size: file.length,
      },
    })

    // Pipe the buffer to GridFS
    await new Promise<void>((resolve, reject) => {
      readableStream
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', resolve)
    })

    // Return the file ID as string (can be used to retrieve the file)
    return uploadStream.id.toString()
  } catch (error) {
    console.error('MongoDB GridFS upload error:', error)
    throw new Error('Failed to upload file to MongoDB GridFS')
  }
}

/**
 * Download file from MongoDB GridFS
 */
export async function downloadFromMongoDB(fileId: string): Promise<Buffer> {
  try {
    const bucket = await getGridFSBucket()
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId))

    const chunks: Buffer[] = []

    return new Promise((resolve, reject) => {
      downloadStream
        .on('data', (chunk) => chunks.push(chunk))
        .on('error', reject)
        .on('end', () => resolve(Buffer.concat(chunks)))
    })
  } catch (error) {
    console.error('MongoDB GridFS download error:', error)
    throw new Error('Failed to download file from MongoDB GridFS')
  }
}

/**
 * Get download URL for MongoDB file
 * Returns an API endpoint URL that will stream the file
 */
export function getMongoDBDownloadURL(fileId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/files/${fileId}`
}

/**
 * Delete file from MongoDB GridFS
 */
export async function deleteFromMongoDB(fileId: string): Promise<void> {
  try {
    const bucket = await getGridFSBucket()
    await bucket.delete(new ObjectId(fileId))
  } catch (error) {
    console.error('MongoDB GridFS delete error:', error)
    throw new Error('Failed to delete file from MongoDB GridFS')
  }
}

/**
 * Find file by filename
 */
export async function findFileByName(fileName: string): Promise<string | null> {
  try {
    const bucket = await getGridFSBucket()
    const files = await bucket.find({ filename: fileName }).toArray()

    if (files.length > 0) {
      return files[0]._id.toString()
    }

    return null
  } catch (error) {
    console.error('MongoDB GridFS find error:', error)
    return null
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(fileId: string) {
  try {
    const bucket = await getGridFSBucket()
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray()

    if (files.length > 0) {
      return {
        id: files[0]._id.toString(),
        filename: files[0].filename,
        contentType: files[0].contentType,
        length: files[0].length,
        uploadDate: files[0].uploadDate,
        metadata: files[0].metadata,
      }
    }

    return null
  } catch (error) {
    console.error('MongoDB GridFS metadata error:', error)
    return null
  }
}

/**
 * List all files in a folder
 */
export async function listFilesByFolder(folder: string) {
  try {
    const bucket = await getGridFSBucket()
    const files = await bucket.find({ 'metadata.folder': folder }).toArray()

    return files.map(file => ({
      id: file._id.toString(),
      filename: file.filename,
      contentType: file.contentType,
      length: file.length,
      uploadDate: file.uploadDate,
      metadata: file.metadata,
    }))
  } catch (error) {
    console.error('MongoDB GridFS list error:', error)
    return []
  }
}

/**
 * Close MongoDB connection (call on app shutdown)
 */
export async function closeMongoDBConnection() {
  if (client) {
    await client.close()
    client = null
    gridFSBucket = null
  }
}
