import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth/server'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'

export const dynamic = 'force-dynamic'

const QUERY_LIMIT = 500
const RECENT_LIMIT = 50
const ACTIVE_THRESHOLD_SECONDS = 90

type SessionData = {
  sessionId?: string
  ip?: string
  userAgent?: string
  startedAt?: unknown
  lastSeenAt?: unknown
  endedAt?: unknown
  durationSeconds?: number
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const maybeWithToDate = value as { toDate?: () => Date }
  if (typeof maybeWithToDate.toDate === 'function') {
    const converted = maybeWithToDate.toDate()
    return Number.isNaN(converted.getTime()) ? null : converted
  }

  return null
}

function normalizeDurationSeconds(raw: number | undefined, startedAt: Date | null, lastSeenAt: Date | null): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw)
  }

  if (!startedAt || !lastSeenAt) return 0
  const derived = Math.round((lastSeenAt.getTime() - startedAt.getTime()) / 1000)
  return derived > 0 ? derived : 0
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  const user = await getRequestUser(request)
  if (user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const articleId = params.id
  if (!articleId) {
    return NextResponse.json(
      { success: false, error: 'Article ID is required' },
      { status: 400 }
    )
  }

  const db = getAdminDb()

  try {
    const articleRef = db.collection('articles').doc(articleId)
    const articleSnap = await articleRef.get()

    if (!articleSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      )
    }

    const sessionsSnap = await articleRef
      .collection('viewSessions')
      .orderBy('startedAt', 'desc')
      .limit(QUERY_LIMIT)
      .get()

    const nowMs = Date.now()
    const uniqueIps = new Set<string>()
    const visitorCounts = new Map<string, number>()
    let totalDuration = 0
    let activeReaders = 0

    const recentSessions = sessionsSnap.docs.slice(0, RECENT_LIMIT).map((doc) => {
      const data = doc.data() as SessionData
      const startedAt = toDate(data.startedAt)
      const lastSeenAt = toDate(data.lastSeenAt)
      const durationSeconds = normalizeDurationSeconds(data.durationSeconds, startedAt, lastSeenAt)
      const ip = data.ip || 'unknown'
      const userAgent = data.userAgent || 'unknown'
      const isActive = Boolean(
        lastSeenAt && nowMs - lastSeenAt.getTime() <= ACTIVE_THRESHOLD_SECONDS * 1000
      )

      if (ip !== 'unknown') {
        uniqueIps.add(ip)
        visitorCounts.set(ip, (visitorCounts.get(ip) || 0) + 1)
      }

      totalDuration += durationSeconds
      if (isActive) {
        activeReaders += 1
      }

      return {
        sessionId: data.sessionId || doc.id,
        ip,
        userAgent,
        durationSeconds,
        startedAt: startedAt ? startedAt.toISOString() : null,
        lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
        isActive,
      }
    })

    // Include data from older sessions not in recentSessions.
    for (const doc of sessionsSnap.docs.slice(RECENT_LIMIT)) {
      const data = doc.data() as SessionData
      const ip = data.ip || 'unknown'
      const startedAt = toDate(data.startedAt)
      const lastSeenAt = toDate(data.lastSeenAt)
      const durationSeconds = normalizeDurationSeconds(data.durationSeconds, startedAt, lastSeenAt)

      if (ip !== 'unknown') {
        uniqueIps.add(ip)
        visitorCounts.set(ip, (visitorCounts.get(ip) || 0) + 1)
      }
      totalDuration += durationSeconds

      if (lastSeenAt && nowMs - lastSeenAt.getTime() <= ACTIVE_THRESHOLD_SECONDS * 1000) {
        activeReaders += 1
      }
    }

    const trackedSessions = sessionsSnap.size
    const averageReadSeconds = trackedSessions > 0 ? Math.round(totalDuration / trackedSessions) : 0
    const repeatVisitors = Array.from(visitorCounts.values()).filter((count) => count > 1).length

    const articleData = articleSnap.data() || {}
    const totalViews = typeof articleData.viewCount === 'number' ? articleData.viewCount : trackedSessions

    return NextResponse.json({
      success: true,
      stats: {
        articleId,
        articleTitle: articleData.title || 'Untitled',
        totalViews,
        trackedSessions,
        uniqueVisitors: uniqueIps.size,
        repeatVisitors,
        activeReaders,
        averageReadSeconds,
        recentSessions,
        sampledSessions: trackedSessions,
      },
    })
  } catch (error) {
    console.error('Admin article stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch article stats' },
      { status: 500 }
    )
  }
}
