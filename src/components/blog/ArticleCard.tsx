import Link from 'next/link'
import Image from 'next/image'
import { Article } from '@/types'
import { formatDateShort } from '@/lib/utils'

interface ArticleCardProps {
  article: Article
  basePath?: string
}

export function ArticleCard({ article, basePath = '/blog' }: ArticleCardProps) {
  const categoryLabel =
    article.category ||
    (article.targetAudience === 'professional' ? 'Specjalisci' : 'Pacjenci')

  return (
    <Link href={`${basePath}/${article.slug}`} className="group block min-w-0">
      <article className="min-w-0">
        <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-black/[0.03]">
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-sky-400 to-sky-600" />
          )}
        </div>

        <div className="pt-4">
          <h3 className="text-[clamp(1.35rem,2.2vw,2rem)] font-medium leading-[1.15] tracking-tight text-black transition-colors group-hover:text-black/75">
            {article.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[clamp(0.95rem,1.1vw,1.05rem)]">
            <span className="font-semibold text-black">{categoryLabel}</span>
            <span className="text-black/40">
              {formatDateShort(article.publishedAt || article.createdAt)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
