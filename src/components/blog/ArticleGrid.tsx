'use client'

import { Article } from '@/types'
import { ArticleCard } from './ArticleCard'

interface ArticleGridProps {
  articles: Article[]
  loading?: boolean
  basePath?: string
}

export function ArticleGrid({ articles, loading, basePath }: ArticleGridProps) {
  if (loading) {
    return (
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[16/10] rounded-xl bg-black/[0.04]" />
            <div className="pt-4 space-y-2.5">
              <div className="h-3 w-24 rounded bg-black/[0.04]" />
              <div className="h-4 w-3/4 rounded bg-black/[0.06]" />
              <div className="h-3 w-full rounded bg-black/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-black/35">Brak artykulow do wyswietlenia.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} basePath={basePath} />
      ))}
    </div>
  )
}
