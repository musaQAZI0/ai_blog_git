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
      <div className="space-y-10">
        <div className="animate-pulse border-t border-black/[0.08] pt-8">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start md:gap-8">
            <div className="space-y-3">
              <div className="h-3 w-28 rounded bg-black/[0.05]" />
              <div className="h-8 w-full max-w-xl rounded bg-black/[0.08]" />
              <div className="h-8 w-4/5 rounded bg-black/[0.08]" />
              <div className="h-4 w-full rounded bg-black/[0.05]" />
              <div className="h-4 w-4/5 rounded bg-black/[0.05]" />
            </div>
            <div className="aspect-[16/10] rounded-2xl bg-black/[0.04]" />
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse border-t border-black/[0.08] pt-6">
              <div className="space-y-3">
                <div className="h-3 w-20 rounded bg-black/[0.05]" />
                <div className="h-6 w-4/5 rounded bg-black/[0.08]" />
                <div className="h-4 w-full rounded bg-black/[0.05]" />
              </div>
              <div className="mt-4 aspect-[16/10] rounded-2xl bg-black/[0.04]" />
            </div>
          ))}
        </div>
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

  const [featuredArticle, ...remainingArticles] = articles

  return (
    <div className="space-y-10">
      {featuredArticle && (
        <ArticleCard
          article={featuredArticle}
          basePath={basePath}
          variant="featured"
        />
      )}

      {remainingArticles.length > 0 && (
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
          {remainingArticles.map((article) => (
            <div key={article.id} className="min-w-0">
              <ArticleCard article={article} basePath={basePath} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
