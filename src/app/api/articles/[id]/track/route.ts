import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'

export const dynamic = 'force-dynamic'

const VALID_EVENTS = new Set(['start', 'heartbeat', 'end'])

type TrackEvent = 'start' | 'heartbeat' | 'end'

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return 'unknown'
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.JWT_SECRET || 'article-views-salt'
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex')
}

function normalizeDurationSeconds(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  if (value < 0) return 0
  return Math.min(Math.round(value), 60 * 60 * 8)
}

function normalizeSessionId(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 128) {
    return value.trim()
  }
  return randomUUID()
}

function normalizeEvent(value: unknown): TrackEvent {
  if (typeof value === 'string' && VALID_EVENTS.has(value)) {
    return value as TrackEvent
  }
  return 'heartbeat'
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminConfigured()) {
    // Do not break article pages when Admin SDK is unavailable.
    return NextResponse.json({ success: true, tracking: false })
  }

  const articleId = params.id
  if (!articleId) {
    return NextResponse.json(
      { success: false, error: 'Article ID is required' },
      { status: 400 }
    )
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    // Ignore malformed JSON and fall back to defaults.
  }

  const sessionId = normalizeSessionId(payload.sessionId)
  const event = normalizeEvent(payload.event)
  const durationSeconds = normalizeDurationSeconds(payload.durationSeconds)

  const ip = getClientIp(request)
  const ipHash = hashIp(ip)
  const userAgent = request.headers.get('user-agent') || 'unknown'

  const db = getAdminDb()
  const articleRef = db.collection('articles').doc(articleId)
  const sessionRef = articleRef.collection('viewSessions').doc(sessionId)
  const now = FieldValue.serverTimestamp()

  try {
    let isNewSession = false

    await db.runTransaction(async (transaction) => {
      const [articleSnap, sessionSnap] = await Promise.all([
        transaction.get(articleRef),
        transaction.get(sessionRef),
      ])

      if (!articleSnap.exists) {
        throw new Error('ARTICLE_NOT_FOUND')
      }

      if (!sessionSnap.exists) {
        isNewSession = true
        transaction.set(sessionRef, {
          sessionId,
          articleId,
          ip,
          ipHash,
          userAgent,
          eventCount: 1,
          durationSeconds,
          startedAt: now,
          lastSeenAt: now,
          endedAt: event === 'end' ? now : null,
          createdAt: now,
          updatedAt: now,
        })
        transaction.update(articleRef, {
          viewCount: FieldValue.increment(1),
          updatedAt: now,
        })
        return
      }

      const previousData = sessionSnap.data()
      const previousDuration =
        typeof previousData?.durationSeconds === 'number' ? previousData.durationSeconds : 0

      transaction.set(
        sessionRef,
        {
          articleId,
          ip,
          ipHash,
          userAgent,
          durationSeconds: Math.max(previousDuration, durationSeconds),
          eventCount: FieldValue.increment(1),
          lastSeenAt: now,
          endedAt: event === 'end' ? now : null,
          updatedAt: now,
        },
        { merge: true }
      )
    })

    return NextResponse.json({
      success: true,
      tracking: true,
      sessionId,
      isNewSession,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'ARTICLE_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      )
    }

    console.error('Article tracking error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to track article session' },
      { status: 500 }
    )
  }
}
