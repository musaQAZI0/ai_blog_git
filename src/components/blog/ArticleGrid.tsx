'use client'

import { Article } from '@/types'
import { ArticleCard } from './ArticleCard'
import { Skeleton } from '@/components/ui'

interface ArticleGridProps {
  articles: Article[]
  loading?: boolean
  basePath?: string
}

export function ArticleGrid({ articles, loading, basePath }: ArticleGridProps) {
  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[16/9] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Brak artykulow do wyswietlenia.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} basePath={basePath} />
      ))}
    </div>
  )
}
