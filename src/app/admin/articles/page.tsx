'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui'
import { getArticles, deleteArticle } from '@/lib/firebase/articles'
import { Article } from '@/types'
import { formatDateShort } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

export default function AdminArticlesPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminArticlesContent />
    </ProtectedRoute>
  )
}

function AdminArticlesContent() {
  const [articles, setArticles] = useState<Article[]>([])
  const [drafts, setDrafts] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const handleDelete = async (articleId: string, status: 'draft' | 'published') => {
    if (!confirm('Czy na pewno chcesz usunac ten artykul?')) return
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
        alert('Nie udalo sie usunac artykulu')
        setActionLoading(null)
        return
      }
    }

    if (status === 'draft') {
      setDrafts((prev) => prev.filter((a) => a.id !== articleId))
    } else {
      setArticles((prev) => prev.filter((a) => a.id !== articleId))
    }
    setActionLoading(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Articles (Admin)</h1>
          <p className="text-muted-foreground">Review and manage all published articles.</p>
        </div>
        <Button asChild>
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
                      Author: {article.authorName || 'Unknown'} â€¢ Views: {article.viewCount || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated: {formatDateShort(article.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
                      Author: {article.authorName || 'Unknown'} • Views: {article.viewCount || 0}
                    </p>
                    {article.publishedAt && (
                      <p className="text-xs text-muted-foreground">
                        Published: {formatDateShort(article.publishedAt as unknown as string)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{article.status}</Badge>
                    <Badge variant="outline">{article.targetAudience}</Badge>
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
    </div>
  )
}
