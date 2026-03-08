import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth/server'
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

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
    const confirmEmail = typeof body?.confirmEmail === 'string' ? body.confirmEmail.trim() : ''

    if (!confirmEmail) {
      return NextResponse.json(
        { success: false, error: 'Email confirmation required' },
        { status: 400 }
      )
    }

    if (requestedUserId !== requestUser.uid && requestUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const adminDb = getAdminDb()
    const userRef = adminDb.collection('users').doc(requestedUserId)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = userSnap.data() || {}
    if ((userData.email || '').toLowerCase() !== confirmEmail.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Email confirmation does not match' },
        { status: 400 }
      )
    }

    const [articlesSnapshot, consentSnapshot, newsletterSnapshot] = await Promise.all([
      adminDb.collection('articles').where('authorId', '==', requestedUserId).get(),
      adminDb.collection('consentLogs').where('userId', '==', requestedUserId).get().catch(() => null),
      adminDb.collection('newsletterSubscriptions').where('userId', '==', requestedUserId).get().catch(() => null),
    ])

    const batch = adminDb.batch()

    batch.delete(userRef)
    batch.delete(adminDb.collection('pendingApprovals').doc(requestedUserId))

    articlesSnapshot.docs.forEach((articleDoc) => {
      batch.update(articleDoc.ref, {
        authorId: 'deleted-user',
        authorName: 'Usunięty użytkownik',
      })
    })

    consentSnapshot?.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    newsletterSnapshot?.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    try {
      await getAdminAuth().deleteUser(requestedUserId)
    } catch (error) {
      console.warn('Failed to delete auth user:', error)
    }

    console.log(`GDPR deletion completed for user: ${requestedUserId}`)

    return NextResponse.json({
      success: true,
      message: 'Dane zostały usunięte zgodnie z RODO',
    })
  } catch (error) {
    console.error('GDPR deletion error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Deletion failed' },
      { status: 500 }
    )
  }
}
