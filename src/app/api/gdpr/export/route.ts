import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth/server'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin is not configured' },
        { status: 503 }
      )
    }

    const requestUser = await getRequestUser(request)
    if (!requestUser.uid || requestUser.role === 'guest') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const requestedUserId =
      typeof body?.userId === 'string' && body.userId.trim()
        ? body.userId.trim()
        : requestUser.uid

    if (requestedUserId !== requestUser.uid && requestUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const adminDb = getAdminDb()
    const [userDoc, articlesSnapshot, consentSnapshot, newsletterSnapshot] = await Promise.all([
      adminDb.collection('users').doc(requestedUserId).get(),
      adminDb.collection('articles').where('authorId', '==', requestedUserId).get(),
      adminDb.collection('consentLogs').where('userId', '==', requestedUserId).get().catch(() => null),
      adminDb.collection('newsletterSubscriptions').where('userId', '==', requestedUserId).limit(1).get().catch(() => null),
    ])

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data() || {}
    const newsletterData = newsletterSnapshot?.docs[0]?.data()
    const consentLogs = consentSnapshot?.docs.map((doc) => doc.data()) || []

    const exportData = {
      exportDate: new Date().toISOString(),
      userData: {
        id: requestedUserId,
        email: userData.email,
        name: userData.name,
        phoneNumber: userData.phoneNumber || userData.whatsappNumber,
        professionalType: userData.professionalType,
        registrationNumber: userData.registrationNumber,
        specialization: userData.specialization,
        createdAt: toIsoString(userData.createdAt),
        updatedAt: toIsoString(userData.updatedAt),
        gdprConsentDate: toIsoString(userData.gdprConsentDate),
      },
      articles: articlesSnapshot.docs.map((doc) => {
        const article = doc.data()
        return {
          id: doc.id,
          title: article.title,
          slug: article.slug,
          status: article.status,
          createdAt: toIsoString(article.createdAt),
          publishedAt: toIsoString(article.publishedAt),
          viewCount: article.viewCount || 0,
        }
      }),
      newsletter: newsletterData
        ? {
            subscribed: newsletterData.status !== 'unsubscribed',
            email: newsletterData.email,
            subscribedAt: toIsoString(newsletterData.subscribedAt),
            confirmedAt: toIsoString(newsletterData.confirmedAt),
            unsubscribedAt: toIsoString(newsletterData.unsubscribedAt),
            preferences: newsletterData.preferences || null,
          }
        : null,
      consentLog: consentLogs.map((entry) => ({
        consentType: entry.consentType,
        consented: entry.consented,
        timestamp: toIsoString(entry.consentedAt || entry.timestamp),
        ipHash: entry.ipHash || null,
        userAgent: entry.userAgent || null,
      })),
    }

    return NextResponse.json({
      success: true,
      data: exportData,
    })
  } catch (error) {
    console.error('GDPR export error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
