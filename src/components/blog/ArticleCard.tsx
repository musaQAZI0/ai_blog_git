import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, Badge } from '@/components/ui'
import { Article } from '@/types'
import { formatDate, getReadingTime, truncateText } from '@/lib/utils'
import { Clock, Eye } from 'lucide-react'

interface ArticleCardProps {
  article: Article
  basePath?: string
}

export function ArticleCard({ article, basePath = '/blog' }: ArticleCardProps) {
  const readingTime = getReadingTime(article.content)

  return (
    <Link href={`${basePath}/${article.slug}`}>
      <Card className="group h-full overflow-hidden rounded-2xl border border-black transition-all hover:shadow-lg">
        <div className="relative aspect-[1/1] overflow-hidden bg-[#f2f2f2]">
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-[#f2f2f2]" />
          )}
        </div>
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
            <Badge variant="secondary">{article.category}</Badge>
            {Array.isArray(article.tags) &&
              article.tags.filter(Boolean).slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
          </div>

          <h3 className="mb-2 text-lg font-semibold leading-tight text-black">
            {article.title}
          </h3>

          <p className="mb-4 text-sm text-black">
            {truncateText(article.excerpt, 120)}
          </p>

          <div className="flex items-center justify-between text-xs text-black/70">
            <span>{formatDate(article.publishedAt || article.createdAt)}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {readingTime} min
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {article.viewCount}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
