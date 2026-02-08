import { NextRequest, NextResponse } from 'next/server'
import {
  getArticleById,
  updateArticle,
  deleteArticle,
  publishArticle,
  unpublishArticle,
} from '@/lib/firebase/articles'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await getArticleById(params.id)

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      article,
    })
  } catch (error) {
    console.error('Article fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action, ...updateData } = body

    if (action === 'publish') {
      await publishArticle(params.id)
      return NextResponse.json({ success: true, message: 'Article published' })
    }

    if (action === 'unpublish') {
      await unpublishArticle(params.id)
      return NextResponse.json({ success: true, message: 'Article unpublished' })
    }

    await updateArticle(params.id, updateData)
    return NextResponse.json({ success: true, message: 'Article updated' })
  } catch (error) {
    console.error('Article update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update article' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  try {
    await getAdminDb().collection('articles').doc(params.id).delete()
    return NextResponse.json({ success: true, message: 'Article deleted' })
  } catch (error) {
    console.error('Article delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete article' },
      { status: 500 }
    )
  }
}
