'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Article } from '@/types'
import { fetchPublishedArticleBySlug } from '@/lib/api/articles.client'
import { ArticleView } from '@/components/blog/ArticleView'
import { Skeleton } from '@/components/ui'
import { NewsletterForm } from '@/components/blog/NewsletterForm'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function ProfessionalArticleContent() {
  const params = useParams()
  const slug = params.slug as string
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchArticle() {
      try {
        const fetchedArticle = await fetchPublishedArticleBySlug(slug, 'professional')
        if (!fetchedArticle) {
          setError('Artykuł nie został znaleziony')
          return
        }
        if (fetchedArticle.targetAudience !== 'professional') {
          setError('Ten artykul nie jest dostepny dla specjalistow')
          return
        }
        setArticle(fetchedArticle)
      } catch (err) {
        setError('Wystapil blad podczas ładowania artykułu')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [slug])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="mb-4 h-8 w-3/4" />
        <Skeleton className="mb-8 h-4 w-full" />
        <Skeleton className="mb-4 aspect-[16/9] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            {error || 'Artykuł nie znaleziony'}
          </h1>
          <a href="/professional" className="mt-4 text-primary hover:underline">
            Powrot do listy artykulow
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ArticleView article={article} backPath="/professional" />
        </div>

        <aside className="space-y-6">
          <NewsletterForm variant="card" />
        </aside>
      </div>
    </div>
  )
}

export default function ProfessionalArticlePage() {
  return (
    <ProtectedRoute requireApproved>
      <ProfessionalArticleContent />
    </ProtectedRoute>
  )
}
