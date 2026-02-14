import { NextRequest, NextResponse } from 'next/server'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase/config.server'
import { hashString, validateEmail } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured || !db) {
      // Demo mode - just return success
      return NextResponse.json({
        success: true,
        message: 'Demo mode - newsletter subscription simulated.',
      })
    }

    const body = await request.json()
    const { email, userId } = body

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Nieprawidlowy adres email' },
        { status: 400 }
      )
    }

    // Create a hash of the email as document ID
    const emailHash = hashString(email)

    // Check if already subscribed
    const existingDoc = await getDoc(doc(db, 'newsletterSubscriptions', emailHash))
    if (existingDoc.exists()) {
      const data = existingDoc.data()
      if (!data.unsubscribedAt) {
        return NextResponse.json(
          { success: false, error: 'Ten email jest juz zapisany do newslettera' },
          { status: 400 }
        )
      }
    }

    // Create subscription
    await setDoc(doc(db, 'newsletterSubscriptions', emailHash), {
      email,
      userId: userId || null,
      subscribedAt: serverTimestamp(),
      confirmedAt: serverTimestamp(),
      unsubscribedAt: null,
      preferences: {
        frequency: 'weekly',
        categories: [],
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Zapisano do newslettera.',
    })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { success: false, error: 'Blad zapisu do newslettera' },
      { status: 500 }
    )
  }
}
