'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArticleEditor } from '@/components/dashboard/ArticleEditor'
import { Alert, AlertDescription, Button } from '@/components/ui'
import { getArticleById, updateArticle, publishArticle } from '@/lib/firebase/articles'
import { Article, ArticleCreateData } from '@/types'
import { ArrowLeft, Loader2 } from 'lucide-react'

function DashboardArticleEditContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const articleId = useMemo(() => params?.id, [params])

  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!articleId) return
      setLoading(true)
      setError(null)
      try {
        const existing = await getArticleById(articleId)
        setArticle(existing)
        if (!existing) {
          setError('Nie znaleziono artykulu.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Wystapil blad')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [articleId])

  const handleSave = async (data: ArticleCreateData, publish: boolean) => {
    if (!articleId) return

    setSaving(true)
    setError(null)
    try {
      await updateArticle(articleId, data)
      if (publish) {
        await publishArticle(articleId)
      }
      router.push('/dashboard/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad zapisu artykulu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/dashboard/articles"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrot do listy artykulow
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Edytuj artykul</h1>
            <p className="mt-1 text-muted-foreground">
              Zaktualizuj tresc i opublikuj, gdy bedzie gotowy
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/create">Nowy artykul</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ladowanie...
        </div>
      ) : !article ? null : (
        <ArticleEditor initialData={article} onSave={handleSave} loading={saving} />
      )}
    </div>
  )
}

export default function DashboardArticleEditPage() {
  return (
    <ProtectedRoute requireApproved>
      <DashboardArticleEditContent />
    </ProtectedRoute>
  )
}

