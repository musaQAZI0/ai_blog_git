import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type PublicFirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const getFirebaseConfigFromEnv = (): PublicFirebaseConfig => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
})

const isConfigured = (cfg: PublicFirebaseConfig) =>
  Boolean(
    cfg.apiKey &&
      cfg.apiKey.length > 10 &&
      !cfg.apiKey.includes('your_') &&
      cfg.projectId &&
      cfg.projectId.length > 3 &&
      !cfg.projectId.includes('your_')
  )

export async function GET() {
  const firebase = getFirebaseConfigFromEnv()

  return NextResponse.json(
    {
      firebase,
      configured: isConfigured(firebase),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
