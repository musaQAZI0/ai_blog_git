import Link from 'next/link'
import Image from 'next/image'
import { Article } from '@/types'
import { formatDate, getReadingTime, truncateText } from '@/lib/utils'

interface ArticleCardProps {
  article: Article
  basePath?: string
}

export function ArticleCard({ article, basePath = '/blog' }: ArticleCardProps) {
  const readingTime = getReadingTime(article.content)

  return (
    <Link href={`${basePath}/${article.slug}`} className="group block">
      <article className="h-full">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-black/[0.03]">
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-black/[0.04] to-black/[0.08]" />
          )}
        </div>

        <div className="pt-4">
          <div className="flex items-center gap-2 text-xs text-black/40">
            <span>{formatDate(article.publishedAt || article.createdAt)}</span>
            <span>|</span>
            <span>{readingTime} min</span>
          </div>

          <h3 className="mt-2 text-[15px] font-semibold leading-snug text-black transition-colors group-hover:text-black/70">
            {article.title}
          </h3>

          <p className="mt-1.5 text-sm leading-relaxed text-black/45">
            {truncateText(article.excerpt, 110)}
          </p>
        </div>
      </article>
    </Link>
  )
}
