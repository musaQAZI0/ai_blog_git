import { FieldValue } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth/server'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'
import {
  syncPatientArticleToWordPress,
  WordPressPatientSyncResult,
} from '@/lib/integrations/wordpress.server'

export const dynamic = 'force-dynamic'

function buildWordPressSyncUpdate(syncResult: WordPressPatientSyncResult): Record<string, unknown> {
  return {
    wordpressSync: {
      status: syncResult.success ? 'success' : syncResult.skipped ? 'skipped' : 'failed',
      attemptedAt: FieldValue.serverTimestamp(),
      ...(syncResult.reason ? { reason: syncResult.reason } : {}),
      ...(syncResult.action ? { action: syncResult.action } : {}),
      ...(typeof syncResult.postId === 'number' ? { postId: syncResult.postId } : {}),
      ...(syncResult.postUrl ? { postUrl: syncResult.postUrl } : {}),
      ...(syncResult.error ? { error: syncResult.error } : {}),
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: user.role === 'guest' ? 401 : 403 }
      )
    }

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin is not configured.' },
        { status: 500 }
      )
    }

    const body = (await request.json().catch(() => null)) as { articleId?: string } | null
    const articleId = body?.articleId?.trim()
    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Missing articleId' },
        { status: 400 }
      )
    }

    const articleRef = getAdminDb().collection('articles').doc(articleId)
    const snap = await articleRef.get()
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      )
    }

    const article = snap.data() || {}
    const targetAudience = article.targetAudience
    const status = article.status

    if (targetAudience !== 'patient') {
      return NextResponse.json({
        success: true,
        sync: {
          success: false,
          skipped: true,
          reason: 'Only patient articles are synced to WordPress',
        } satisfies WordPressPatientSyncResult,
      })
    }

    if (status !== 'published') {
      return NextResponse.json({
        success: true,
        sync: {
          success: false,
          skipped: true,
          reason: 'Only published articles are synced to WordPress',
        } satisfies WordPressPatientSyncResult,
      })
    }

    const syncResult = await syncPatientArticleToWordPress({
      id: snap.id,
      title: String(article.title || ''),
      slug: String(article.slug || ''),
      content: String(article.content || ''),
      excerpt: String(article.excerpt || ''),
    })

    try {
      await articleRef.update(buildWordPressSyncUpdate(syncResult))
    } catch (syncPersistError) {
      console.error('WordPress sync metadata persist error:', syncPersistError)
    }

    return NextResponse.json({
      success: syncResult.success || syncResult.skipped,
      sync: syncResult,
    })
  } catch (error) {
    console.error('WordPress sync route error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'WordPress sync failed',
      },
      { status: 500 }
    )
  }
}

