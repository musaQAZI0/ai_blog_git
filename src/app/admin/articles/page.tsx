'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui'
import { getArticles } from '@/lib/firebase/articles'
import { Article } from '@/types'

export default function AdminArticlesPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminArticlesContent />
    </ProtectedRoute>
  )
}

function AdminArticlesContent() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { articles } = await getArticles({ status: 'published', pageSize: 200 })
        setArticles(articles)
      } catch (err) {
        setError('Failed to load articles')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
                        Published: {new Date(article.publishedAt as unknown as string).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{article.status}</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/articles/${article.id}`}>Edit</Link>
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
