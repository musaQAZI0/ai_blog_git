import Link from 'next/link'
import Image from 'next/image'
import { Article } from '@/types'
import { cn, formatDate, getReadingTime, truncateText } from '@/lib/utils'

interface ArticleCardProps {
  article: Article
  basePath?: string
  variant?: 'default' | 'featured'
}

export function ArticleCard({
  article,
  basePath = '/blog',
  variant = 'default',
}: ArticleCardProps) {
  const readingTime = getReadingTime(article.content)
  const isFeatured = variant === 'featured'
  const audienceLabel =
    article.targetAudience === 'professional' ? 'Specjalisci' : 'Pacjenci'

  return (
    <Link href={`${basePath}/${article.slug}`} className="group block min-w-0">
      <article
        className={cn(
          'grid min-w-0 gap-5 border-t border-black/[0.08] pt-6',
          isFeatured
            ? 'md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start md:gap-8 md:pt-8'
            : 'sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start sm:gap-6'
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-black/45">
            <span>{audienceLabel}</span>
            <span className="h-1 w-1 rounded-full bg-black/20" />
            <span className="tracking-normal normal-case text-xs">
              {formatDate(article.publishedAt || article.createdAt)}
            </span>
            <span className="h-1 w-1 rounded-full bg-black/20" />
            <span className="tracking-normal normal-case text-xs">{readingTime} min</span>
          </div>

          <h3
            className={cn(
              'mt-3 font-semibold leading-tight tracking-tight text-black transition-colors group-hover:text-black/70',
              isFeatured ? 'text-[clamp(1.4rem,3vw,2rem)]' : 'text-[clamp(1.1rem,2.2vw,1.4rem)]'
            )}
          >
            {article.title}
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55 sm:text-[15px]">
            {truncateText(article.excerpt, isFeatured ? 210 : 140)}
          </p>
        </div>

        <div
          className={cn(
            'relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-black/[0.03]',
            !isFeatured && 'sm:aspect-[4/3]'
          )}
        >
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              sizes={
                isFeatured
                  ? '(max-width: 768px) 100vw, (max-width: 1280px) 40vw, 36vw'
                  : '(max-width: 640px) 100vw, (max-width: 1024px) 34vw, 22vw'
              }
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-black/[0.04] to-black/[0.08]" />
          )}
        </div>
      </article>
    </Link>
  )
}
