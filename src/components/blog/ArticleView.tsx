'use client'

import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Article } from '@/types'
import { Badge, Avatar } from '@/components/ui'
import { formatDate, getReadingTime } from '@/lib/utils'
import { Clock, Eye, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

interface ArticleViewProps {
  article: Article
  backPath?: string
}

export function ArticleView({ article, backPath = '/blog' }: ArticleViewProps) {
  const readingTime = getReadingTime(article.content)
  const { isDemoMode } = useAuth()
  const trackingArticleIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (isDemoMode || typeof window === 'undefined') return
    if (trackingArticleIdRef.current === article.id) return
    trackingArticleIdRef.current = article.id

    const storageKey = `article-track-session:${article.id}`
    const now = Date.now()
    const twoMinutesMs = 2 * 60 * 1000

    const parseStoredSession = (): { sessionId: string; lastSeenAt: number } | null => {
      try {
        const raw = window.sessionStorage.getItem(storageKey)
        if (!raw) return null
        const parsed = JSON.parse(raw) as { sessionId?: unknown; lastSeenAt?: unknown }
        if (typeof parsed.sessionId !== 'string' || typeof parsed.lastSeenAt !== 'number') {
          return null
        }
        return { sessionId: parsed.sessionId, lastSeenAt: parsed.lastSeenAt }
      } catch {
        return null
      }
    }

    const previousSession = parseStoredSession()
    const shouldReuseSession =
      previousSession && now - previousSession.lastSeenAt < twoMinutesMs

    const sessionId =
      shouldReuseSession && previousSession
        ? previousSession.sessionId
        : (window.crypto?.randomUUID?.() ??
            `session-${Date.now()}-${Math.random().toString(36).slice(2)}`)

    const startTime = Date.now()

    const persistSession = () => {
      try {
        window.sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            sessionId,
            lastSeenAt: Date.now(),
          })
        )
      } catch {
        // Ignore storage errors.
      }
    }

    const sendTrackEvent = (event: 'start' | 'heartbeat' | 'end', keepalive = false) => {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000))
      persistSession()

      fetch(`/api/articles/${article.id}/track`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          event,
          sessionId,
          durationSeconds,
        }),
        keepalive,
      }).catch(() => {})
    }

    sendTrackEvent(shouldReuseSession ? 'heartbeat' : 'start')

    const heartbeatInterval = window.setInterval(() => {
      sendTrackEvent('heartbeat')
    }, 15000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendTrackEvent('heartbeat', true)
      }
    }

    const handlePageHide = () => {
      sendTrackEvent('end', true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handlePageHide)

    return () => {
      window.clearInterval(heartbeatInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handlePageHide)
      sendTrackEvent('end', true)
      trackingArticleIdRef.current = null
    }
  }, [article.id, isDemoMode])

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href={backPath}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Powrot do listy artykulow
      </Link>

      <header className="mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl">
          {article.title}
        </h1>

        <p className="mb-6 text-lg text-muted-foreground">{article.excerpt}</p>

        <div className="flex flex-wrap items-center gap-4 border-b pb-6">
          <div className="flex items-center gap-2">
            <Avatar fallback={article.authorName} size="sm" />
            <span className="text-sm font-medium">{article.authorName}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(article.publishedAt || article.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {readingTime} min czytania
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.viewCount} wyswietlen
            </span>
          </div>
        </div>
      </header>

      {article.coverImage && (
        <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-lg">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      )}

      <div className="prose prose-lg max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {article.content}
        </ReactMarkdown>
      </div>

      <footer className="mt-8 border-t pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Tagi:</span>
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </footer>
    </article>
  )
}
