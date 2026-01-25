import { NextResponse } from 'next/server'
import { isFirebaseConfigured } from '@/lib/firebase/config'

/**
 * Health check endpoint for monitoring services (Render, uptime monitors, etc.)
 * Returns 200 OK if the service is running and Firebase is configured
 */
export async function GET() {
  try {
    // Check if critical services are configured
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Medical Blog API',
      version: '1.0.0',
      checks: {
        firebase: isFirebaseConfigured,
        openai: Boolean(process.env.OPENAI_API_KEY),
        email: Boolean(
          process.env.SENDGRID_API_KEY ||
            process.env.MAILCHIMP_API_KEY ||
            process.env.AWS_ACCESS_KEY_ID
        ),
        storage: Boolean(process.env.STORAGE_PROVIDER),
      },
    }

    // If Firebase is not configured, return 503 Service Unavailable
    if (!isFirebaseConfigured) {
      return NextResponse.json(
        {
          ...healthStatus,
          status: 'degraded',
          message: 'Firebase not configured',
        },
        { status: 503 }
      )
    }

    return NextResponse.json(healthStatus, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed',
      },
      { status: 503 }
    )
  }
}
