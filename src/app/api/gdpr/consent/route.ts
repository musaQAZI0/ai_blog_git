import { NextRequest, NextResponse } from 'next/server'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase/config.server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Log GDPR consent for audit trail
 * Required by GDPR Article 7(1) - demonstrable consent
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured || !db) {
      // Gracefully handle when Firebase is not configured
      return NextResponse.json({
        success: true,
        message: 'Consent logged (Firebase not configured)',
      })
    }

    const body = await request.json()
    const { consentType, preferences, timestamp } = body

    // Get IP address for logging (hashed for privacy)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex')

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log consent to Firestore
    const consentData = {
      consentType,
      preferences,
      timestamp: timestamp || new Date().toISOString(),
      ipHash,
      userAgent,
      createdAt: serverTimestamp(),
    }

    await addDoc(collection(db, 'consentLogs'), consentData)

    return NextResponse.json({
      success: true,
      message: 'Consent logged successfully',
    })
  } catch (error) {
    console.error('Error logging consent:', error)
    // Don't fail the request if logging fails
    return NextResponse.json({
      success: true,
      message: 'Consent processed (logging failed)',
    })
  }
}
