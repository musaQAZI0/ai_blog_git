import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase/config'

export const dynamic = 'force-dynamic'

// GDPR data export endpoint
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured || !db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }

    // Fetch user data
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()

    // Fetch user's articles
    const articlesQuery = query(
      collection(db, 'articles'),
      where('authorId', '==', userId)
    )
    const articlesSnapshot = await getDocs(articlesQuery)
    const articles = articlesSnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      userData: {
        id: userId,
        email: userData.email,
        name: userData.name,
        professionalType: userData.professionalType,
        registrationNumber: userData.registrationNumber,
        specialization: userData.specialization,
        createdAt: userData.createdAt?.toDate?.()?.toISOString(),
        gdprConsentDate: userData.gdprConsentDate?.toDate?.()?.toISOString(),
      },
      articles: articles.map((a: Record<string, unknown>) => ({
        id: a.id,
        title: a.title,
        createdAt: (a.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString(),
        status: a.status,
      })),
      newsletter: null,
    }

    return NextResponse.json({
      success: true,
      data: exportData,
    })
  } catch (error) {
    console.error('GDPR export error:', error)
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    )
  }
}
