import { NextResponse } from 'next/server'
import { isFirebaseConfigured } from '@/lib/firebase/config.server'

/**
 * Health check endpoint for monitoring services (Render, uptime monitors, etc.)
 * Returns 200 OK if the service is running and Firebase is configured
 */
export async function GET() {
  try {
    // Detailed environment variable check
    const envVars = {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? `Set (${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 10)}...)` : 'Missing',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Missing',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Missing',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'Set' : 'Missing',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'Set' : 'Missing',
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'Set' : 'Missing',
    }

    // Check if critical services are configured
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
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
      firebase_env_vars: envVars,
    }

    // If Firebase is not configured, return 503 Service Unavailable
    if (!isFirebaseConfigured) {
      return NextResponse.json(
        {
          ...healthStatus,
          status: 'degraded',
          message: 'Firebase not configured - Check firebase_env_vars for details',
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
