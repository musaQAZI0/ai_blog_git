'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui'
import { getArticles, deleteArticle } from '@/lib/firebase/articles'
import { Article } from '@/types'
import { formatDateShort } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

interface RecentSession {
  sessionId: string
  ip: string
  userAgent: string
  durationSeconds: number
  startedAt: string | null
  lastSeenAt: string | null
  isActive: boolean
}

interface ArticleLiveStats {
  articleId: string
  articleTitle: string
  totalViews: number
  trackedSessions: number
  uniqueVisitors: number
  repeatVisitors: number
  activeReaders: number
  averageReadSeconds: number
  recentSessions: RecentSession[]
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('pl-PL')
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export default function AdminArticlesPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminArticlesContent />
    </ProtectedRoute>
  )
}

function AdminArticlesContent() {
  const { firebaseUser } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [drafts, setDrafts] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [liveStats, setLiveStats] = useState<ArticleLiveStats | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [publishedRes, draftRes] = await Promise.all([
          getArticles({ status: 'published', pageSize: 200 }),
          getArticles({ status: 'draft', pageSize: 200 }),
        ])
        setArticles(publishedRes.articles)
        setDrafts(draftRes.articles)
      } catch (err) {
        setError('Failed to load articles')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!selectedArticleId || !firebaseUser) return

    let isActive = true
    let isFirstFetch = true

    const fetchStats = async () => {
      try {
        if (isFirstFetch) {
          setStatsLoading(true)
          setStatsError(null)
        }

        const idToken = await firebaseUser.getIdToken()
        const response = await fetch(`/api/admin/articles/${selectedArticleId}/stats`, {
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        })
        const result = (await response.json().catch(() => null)) as
          | { success?: boolean; error?: string; stats?: ArticleLiveStats }
          | null

        if (!response.ok || !result?.success || !result.stats) {
          throw new Error(result?.error || 'Failed to load live stats')
        }

        if (!isActive) return
        setLiveStats(result.stats)
        setStatsError(null)
      } catch (err) {
        if (!isActive) return
        setStatsError(err instanceof Error ? err.message : 'Failed to load live stats')
      } finally {
        if (isFirstFetch && isActive) {
          setStatsLoading(false)
          isFirstFetch = false
        }
      }
    }

    fetchStats()
    const intervalId = window.setInterval(fetchStats, 10000)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [selectedArticleId, firebaseUser])

  const handleDelete = async (articleId: string, status: 'draft' | 'published') => {
    if (!confirm('Are you sure you want to delete this article?')) return

    setActionLoading(articleId)
    try {
      const res = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Delete failed')
      }
    } catch (err) {
      console.warn('Delete API failed, trying client SDK fallback:', err)
      try {
        await deleteArticle(articleId)
      } catch (fallbackError) {
        console.error('Delete fallback error:', fallbackError)
        alert('Failed to delete article')
        setActionLoading(null)
        return
      }
    }

    if (status === 'draft') {
      setDrafts((prev) => prev.filter((a) => a.id !== articleId))
    } else {
      setArticles((prev) => prev.filter((a) => a.id !== articleId))
    }

    if (selectedArticleId === articleId) {
      setSelectedArticleId(null)
      setLiveStats(null)
      setStatsError(null)
    }

    setActionLoading(null)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Articles (Admin)</h1>
          <p className="text-muted-foreground">Review and manage all published articles.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/create">Create new</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Draft submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : drafts.length === 0 ? (
            <p className="text-muted-foreground">No draft submissions.</p>
          ) : (
            <div className="space-y-4">
              {drafts.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{article.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Author: {article.authorName || 'Unknown'} | Views: {article.viewCount || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated: {formatDateShort(article.updatedAt)}
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                    <Badge variant="secondary">{article.status}</Badge>
                    <Badge variant="outline">{article.targetAudience}</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/articles/${article.id}`}>Review</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(article.id, 'draft')}
                      disabled={actionLoading === article.id}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published articles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : articles.length === 0 ? (
            <p className="text-muted-foreground">No articles published yet.</p>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{article.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Author: {article.authorName || 'Unknown'} | Views: {article.viewCount || 0}
                    </p>
                    {article.publishedAt && (
                      <p className="text-xs text-muted-foreground">
                        Published: {formatDateShort(article.publishedAt as unknown as string)}
                      </p>
                    )}
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                    <Badge variant="secondary">{article.status}</Badge>
                    <Badge variant="outline">{article.targetAudience}</Badge>
                    <Button
                      variant={selectedArticleId === article.id ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedArticleId(article.id)
                        setStatsError(null)
                        setLiveStats(null)
                      }}
                    >
                      Live stats
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/articles/${article.id}`}>Edit</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(article.id, 'published')}
                      disabled={actionLoading === article.id}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Real-time article viewers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedArticleId ? (
            <p className="text-muted-foreground">
              Select a published article and click <strong>Live stats</strong>.
            </p>
          ) : statsLoading ? (
            <p className="text-muted-foreground">Loading live stats...</p>
          ) : statsError ? (
            <p className="text-destructive">{statsError}</p>
          ) : !liveStats ? (
            <p className="text-muted-foreground">No stats available yet.</p>
          ) : (
            <>
              <div>
                <p className="font-semibold">{liveStats.articleTitle}</p>
                <p className="text-xs text-muted-foreground">Auto-refresh every 10 seconds.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total views</p>
                  <p className="text-lg font-semibold">{liveStats.totalViews}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Tracked sessions</p>
                  <p className="text-lg font-semibold">{liveStats.trackedSessions}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Unique IPs</p>
                  <p className="text-lg font-semibold">{liveStats.uniqueVisitors}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Active readers</p>
                  <p className="text-lg font-semibold">{liveStats.activeReaders}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Avg read time</p>
                  <p className="text-lg font-semibold">{formatDuration(liveStats.averageReadSeconds)}</p>
                </div>
              </div>

              <div className="space-y-3 md:hidden">
                {liveStats.recentSessions.length === 0 ? (
                  <p className="rounded-md border px-3 py-4 text-sm text-muted-foreground">
                    No viewer sessions recorded yet.
                  </p>
                ) : (
                  liveStats.recentSessions.map((session) => (
                    <div key={session.sessionId} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-xs">{session.ip}</p>
                        <Badge variant={session.isActive ? 'secondary' : 'outline'}>
                          {session.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Read time: {formatDuration(session.durationSeconds)}</p>
                        <p>Started: {formatDateTime(session.startedAt)}</p>
                        <p>Last seen: {formatDateTime(session.lastSeenAt)}</p>
                        <p className="break-words">UA: {session.userAgent}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden overflow-x-auto rounded-md border md:block">
                <table className="min-w-[900px] divide-y divide-border text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">IP</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Read time</th>
                      <th className="px-3 py-2 text-left font-medium">Started</th>
                      <th className="px-3 py-2 text-left font-medium">Last seen</th>
                      <th className="px-3 py-2 text-left font-medium">User agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {liveStats.recentSessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                          No viewer sessions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      liveStats.recentSessions.map((session) => (
                        <tr key={session.sessionId}>
                          <td className="px-3 py-2 font-mono text-xs">{session.ip}</td>
                          <td className="px-3 py-2">
                            <Badge variant={session.isActive ? 'secondary' : 'outline'}>
                              {session.isActive ? 'active' : 'inactive'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{formatDuration(session.durationSeconds)}</td>
                          <td className="px-3 py-2">{formatDateTime(session.startedAt)}</td>
                          <td className="px-3 py-2">{formatDateTime(session.lastSeenAt)}</td>
                          <td className="max-w-[260px] truncate px-3 py-2 text-xs text-muted-foreground">
                            {session.userAgent}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
