import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'
import { TargetAudience } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const targetAudience = searchParams.get('targetAudience') as TargetAudience | null

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    let queryRef = db
      .collection('articles')
      .where('slug', '==', slug)
      .where('status', '==', 'published')
      .limit(1)

    if (targetAudience) {
      queryRef = queryRef.where('targetAudience', '==', targetAudience) as typeof queryRef
    }

    const snapshot = await queryRef.get()
    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      )
    }

    const docSnap = snapshot.docs[0]
    const data = docSnap.data() as Record<string, any>
    const article = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
      publishedAt: data.publishedAt?.toDate?.() || data.publishedAt || null,
    }

    return NextResponse.json({ success: true, article })
  } catch (error) {
    console.error('Article by slug fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}
