import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase/config.server'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'
import { FieldValue } from 'firebase-admin/firestore'
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
    const { email } = body

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Nieprawidłowy adres email' },
        { status: 400 }
      )
    }

    const emailHash = hashString(email)

    if (isFirebaseAdminConfigured()) {
      const adminDb = getAdminDb()
      const subscriptionRef = adminDb.collection('newsletterSubscriptions').doc(emailHash)
      const subscriptionDoc = await subscriptionRef.get()

      if (!subscriptionDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Nie znaleziono subskrypcji' },
          { status: 404 }
        )
      }

      await subscriptionRef.update({
        unsubscribedAt: FieldValue.serverTimestamp(),
      })
    } else {
      // Fallback for environments without Firebase Admin.
      // Public rules allow the update but block the pre-read, so update directly.
      try {
        await updateDoc(doc(db, 'newsletterSubscriptions', emailHash), {
          unsubscribedAt: serverTimestamp(),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : ''
        if (message.includes('not-found') || message.includes('no document to update')) {
          return NextResponse.json(
            { success: false, error: 'Nie znaleziono subskrypcji' },
            { status: 404 }
          )
        }
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pomyslnie wypisano z newslettera.',
    })
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return NextResponse.json(
      { success: false, error: 'Błąd wypisywania z newslettera' },
      { status: 500 }
    )
  }
}
