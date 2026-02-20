'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Article } from '@/types'
import { getMockArticleBySlug } from '@/lib/mock-data'
import { fetchPublishedArticleBySlug } from '@/lib/api/articles.client'
import { ArticleView } from '@/components/blog/ArticleView'
import { Skeleton } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

export default function PatientArticlePage() {
  const params = useParams()
  const slug = params.slug as string
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isDemoMode } = useAuth()

  useEffect(() => {
    async function fetchArticle() {
      try {
        let fetchedArticle: Article | null = null

        if (isDemoMode) {
          // Use mock data in demo mode
          fetchedArticle = getMockArticleBySlug(slug)
        } else {
          fetchedArticle = await fetchPublishedArticleBySlug(slug, 'patient')
        }

        if (!fetchedArticle) {
          setError('Artykuł nie został znaleziony')
          return
        }
        if (fetchedArticle.targetAudience !== 'patient') {
          setError('Ten artykul nie jest dostepny dla pacjentow')
          return
        }
        setArticle(fetchedArticle)
      } catch (err) {
        // Fallback to mock data on error
        const mockArticle = getMockArticleBySlug(slug)
        if (mockArticle && mockArticle.targetAudience === 'patient') {
          setArticle(mockArticle)
        } else {
          setError('Wystapil blad podczas ładowania artykułu')
          console.error(err)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [slug, isDemoMode])

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
          <a href="/patient" className="mt-4 text-primary hover:underline">
            Powrot do listy artykulow
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <ArticleView article={article} backPath="/patient" />
    </div>
  )
}
