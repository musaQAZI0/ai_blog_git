import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'crypto'
import { ArticleCreateData } from '@/types'
import { generateSlug } from '@/lib/utils'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

function isNonEmptyString(value: unknown, min = 1): value is string {
  return typeof value === 'string' && value.trim().length >= min
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimit(`patient-submit:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, error: 'Za duzo prob. Sprobuj ponownie pozniej.' },
        { status: 429 }
      )
    }

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin is not configured.' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as Partial<ArticleCreateData>

    if (!isNonEmptyString(body.title, 5)) {
      return NextResponse.json({ success: false, error: 'Nieprawidlowy tytul' }, { status: 400 })
    }
    if (!isNonEmptyString(body.content, 100)) {
      return NextResponse.json({ success: false, error: 'Nieprawidlowa tresc' }, { status: 400 })
    }
    if (!isNonEmptyString(body.excerpt, 20)) {
      return NextResponse.json({ success: false, error: 'Nieprawidlowe streszczenie' }, { status: 400 })
    }
    if (!isNonEmptyString(body.category, 1)) {
      return NextResponse.json({ success: false, error: 'Wybierz kategorie' }, { status: 400 })
    }

    const seoMeta = body.seoMeta
    if (
      !seoMeta ||
      !isNonEmptyString(seoMeta.title, 1) ||
      !isNonEmptyString(seoMeta.description, 1) ||
      !Array.isArray(seoMeta.keywords)
    ) {
      return NextResponse.json({ success: false, error: 'Nieprawidlowe SEO meta' }, { status: 400 })
    }

    const baseSlug = generateSlug(body.title)
    const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`

    const autoPublish = process.env.GUEST_PATIENT_ARTICLES_AUTO_PUBLISH === '1'
    const db = getAdminDb()

    const articleDoc: Record<string, unknown> = {
      title: body.title,
      slug,
      content: body.content,
      excerpt: body.excerpt,
      category: body.category,
      targetAudience: 'patient',
      authorId: 'guest',
      authorName: 'Guest Patient',
      status: autoPublish ? 'published' : 'draft',
      seoMeta: {
        title: seoMeta.title,
        description: seoMeta.description,
        keywords: seoMeta.keywords,
        ...(seoMeta.ogImage ? { ogImage: seoMeta.ogImage } : {}),
      },
      tags: Array.isArray(body.tags) ? body.tags : [],
      viewCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(autoPublish ? { publishedAt: FieldValue.serverTimestamp() } : {}),
      submissionSource: 'public-patient-generator',
      submittedAt: FieldValue.serverTimestamp(),
    }

    if (body.coverImage) {
      articleDoc.coverImage = body.coverImage
    }

    const docRef = await db.collection('articles').add(articleDoc)

    return NextResponse.json({ success: true, id: docRef.id, slug, status: autoPublish ? 'published' : 'draft' })
  } catch (error) {
    console.error('Patient submit error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit' },
      { status: 500 }
    )
  }
}
