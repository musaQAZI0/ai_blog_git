'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
} from '@/components/ui'
import {
  getArticlesByAuthor,
  deleteArticle,
  publishArticle,
  unpublishArticle,
} from '@/lib/firebase/articles'
import { Article } from '@/types'
import { ArrowLeft, Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { formatDate } from '@/lib/utils'

function DashboardArticlesContent() {
  const { user } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchArticles = useCallback(async () => {
    if (!user) return
    try {
      const userArticles = await getArticlesByAuthor(user.id)
      setArticles(userArticles)
      setFilteredArticles(userArticles)
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  useEffect(() => {
    if (!searchQuery) {
      setFilteredArticles(articles)
      return
    }

    setFilteredArticles(
      articles.filter((a) => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [articles, searchQuery])

  const handleDelete = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return

    try {
      await deleteArticle(articleId)
      fetchArticles()
    } catch (error) {
      console.error('Error deleting article:', error)
    }
  }

  const handleTogglePublish = async (article: Article) => {
    try {
      if (article.status === 'published') {
        await unpublishArticle(article.id)
      } else {
        await publishArticle(article.id)
      }
      fetchArticles()
    } catch (error) {
      console.error('Error toggling publish:', error)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Articles</h1>
            <p className="mt-1 text-muted-foreground">Manage your articles</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/create">
              <Plus className="mr-2 h-4 w-4" />
              New article
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Articles ({filteredArticles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredArticles.length === 0 ? (
            <p className="text-muted-foreground">
              You do not have any articles yet.{' '}
              <Link href="/dashboard/create" className="text-primary hover:underline">
                Create the first one
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/50 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{article.title}</span>
                      <Badge variant={article.status === 'published' ? 'success' : 'secondary'}>
                        {article.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                      <Badge variant="outline">
                        {article.targetAudience === 'patient' ? 'Patient' : 'Professional'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {article.viewCount} views | {formatDate(article.createdAt)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTogglePublish(article)}
                      title={article.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      {article.status === 'published' ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/articles/${article.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(article.id)}>
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

export default function DashboardArticlesPage() {
  return (
    <ProtectedRoute requireAdmin requireApproved={false}>
      <DashboardArticlesContent />
    </ProtectedRoute>
  )
}
