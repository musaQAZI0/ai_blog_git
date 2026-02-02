import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase/config.server'
import { hashString, validateEmail } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured || !db) {
      // Demo mode - just return success
      return NextResponse.json({
        success: true,
        message: 'Demo mode - newsletter unsubscription simulated.',
      })
    }

    const body = await request.json()
    const { email, token } = body

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Nieprawidlowy adres email' },
        { status: 400 }
      )
    }

    const emailHash = hashString(email)

    // Check if subscription exists
    const subscriptionDoc = await getDoc(doc(db, 'newsletterSubscriptions', emailHash))
    if (!subscriptionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Nie znaleziono subskrypcji' },
        { status: 404 }
      )
    }

    // Mark as unsubscribed
    await updateDoc(doc(db, 'newsletterSubscriptions', emailHash), {
      unsubscribedAt: serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: 'Pomyslnie wypisano z newslettera.',
    })
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return NextResponse.json(
      { success: false, error: 'Blad wypisywania z newslettera' },
      { status: 500 }
    )
  }
}
