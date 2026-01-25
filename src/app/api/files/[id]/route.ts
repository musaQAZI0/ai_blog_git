import { NextRequest, NextResponse } from 'next/server'
import { downloadFromMongoDB, getFileMetadata } from '@/lib/storage/mongodb'

/**
 * API endpoint to serve files from MongoDB GridFS
 * GET /api/files/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    // Get file metadata
    const metadata = await getFileMetadata(fileId)

    if (!metadata) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Download file from MongoDB GridFS
    const fileBuffer = await downloadFromMongoDB(fileId)

    // Return file with appropriate headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': metadata.contentType || 'application/octet-stream',
        'Content-Length': metadata.length.toString(),
        'Content-Disposition': `inline; filename="${metadata.filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}
