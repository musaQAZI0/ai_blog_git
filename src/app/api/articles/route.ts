import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'
import { TargetAudience, ArticleStatus } from '@/types'

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
    const targetAudience = searchParams.get('targetAudience') as TargetAudience | null
    const status = searchParams.get('status') as ArticleStatus | null
    const pageSizeParam = parseInt(searchParams.get('pageSize') || '12', 10)
    const pageSize = Math.min(Number.isNaN(pageSizeParam) ? 12 : pageSizeParam, 50)
    const finalStatus: ArticleStatus = status || 'published'
    const orderField = finalStatus === 'published' ? 'publishedAt' : 'updatedAt'

    const db = getAdminDb()
    let queryRef = db
      .collection('articles')
      .where('status', '==', finalStatus)
      .orderBy(orderField, 'desc')
      .limit(pageSize)

    if (targetAudience) {
      queryRef = queryRef.where('targetAudience', '==', targetAudience) as typeof queryRef
    }

    const snapshot = await queryRef.get()
    const articles = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, any>
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
        publishedAt: data.publishedAt?.toDate?.() || data.publishedAt || null,
      }
    })

    return NextResponse.json({
      success: true,
      articles,
    })
  } catch (error) {
    console.error('Articles fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
