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
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-[10px] bg-black/[0.05]" />
            <div className="pt-4 space-y-3">
              <div className="h-7 w-11/12 rounded bg-black/[0.08]" />
              <div className="h-7 w-4/5 rounded bg-black/[0.08]" />
              <div className="flex gap-3">
                <div className="h-5 w-24 rounded bg-black/[0.05]" />
                <div className="h-5 w-20 rounded bg-black/[0.05]" />
              </div>
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
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
      {articles.map((article) => (
        <div key={article.id} className="min-w-0">
          <ArticleCard article={article} basePath={basePath} />
        </div>
      ))}
    </div>
  )
}
