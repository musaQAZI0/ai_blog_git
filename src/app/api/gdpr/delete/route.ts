import { NextRequest, NextResponse } from 'next/server'
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase/config.server'

export const dynamic = 'force-dynamic'

// GDPR data deletion endpoint (right to be forgotten)
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured || !db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { userId, confirmEmail } = body

    if (!userId || !confirmEmail) {
      return NextResponse.json(
        { success: false, error: 'User ID and email confirmation required' },
        { status: 400 }
      )
    }

    const batch = writeBatch(db)

    // Delete user document
    batch.delete(doc(db, 'users', userId))

    // Delete pending approval if exists
    batch.delete(doc(db, 'pendingApprovals', userId))

    // Delete or anonymize user's articles
    const articlesQuery = query(
      collection(db, 'articles'),
      where('authorId', '==', userId)
    )
    const articlesSnapshot = await getDocs(articlesQuery)

    // Anonymize articles (keep content but remove author info)
    articlesSnapshot.docs.forEach((articleDoc) => {
      batch.update(articleDoc.ref, {
        authorId: 'deleted-user',
        authorName: 'Usunięty użytkownik',
      })
    })

    // Commit all deletions
    await batch.commit()

    // Log deletion for compliance
    console.log(`GDPR deletion completed for user: ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Dane zostały usunięte zgodnie z RODO',
    })
  } catch (error) {
    console.error('GDPR deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Deletion failed' },
      { status: 500 }
    )
  }
}
