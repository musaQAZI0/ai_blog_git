'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Article } from '@/types'
import { Badge, Avatar } from '@/components/ui'
import { formatDate, getReadingTime } from '@/lib/utils'
import { Clock, Eye, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

interface ArticleViewProps {
  article: Article
  backPath?: string
}

export function ArticleView({ article, backPath = '/blog' }: ArticleViewProps) {
  const readingTime = getReadingTime(article.content)
  const { isDemoMode } = useAuth()

  useEffect(() => {
    // Increment view count on mount (only if Firebase is configured)
    if (!isDemoMode) {
      import('@/lib/firebase/articles').then(({ incrementViewCount }) => {
        incrementViewCount(article.id).catch(console.error)
      })
    }
  }, [article.id, isDemoMode])

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href={backPath}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Powrot do listy artykulow
      </Link>

      <header className="mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge>{article.category}</Badge>
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl">
          {article.title}
        </h1>

        <p className="mb-6 text-lg text-muted-foreground">{article.excerpt}</p>

        <div className="flex flex-wrap items-center gap-4 border-b pb-6">
          <div className="flex items-center gap-2">
            <Avatar fallback={article.authorName} size="sm" />
            <span className="text-sm font-medium">{article.authorName}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(article.publishedAt || article.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {readingTime} min czytania
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.viewCount} wyswietlen
            </span>
          </div>
        </div>
      </header>

      {article.coverImage && (
        <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-lg">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      )}

      <div className="prose prose-lg max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {article.content}
        </ReactMarkdown>
      </div>

      <footer className="mt-8 border-t pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Tagi:</span>
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </footer>
    </article>
  )
}
