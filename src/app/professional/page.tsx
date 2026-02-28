'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Article } from '@/types'
import { getArticles, searchArticles } from '@/lib/firebase/articles'
import { ArticleGrid } from '@/components/blog/ArticleGrid'
import { SearchBar } from '@/components/blog/SearchBar'
import { NewsletterForm } from '@/components/blog/NewsletterForm'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ChevronDown, Grid3X3, List } from 'lucide-react'
import { cn } from '@/lib/utils'

type SortOption = 'newest' | 'oldest' | 'az' | 'za'
type ViewMode = 'grid' | 'list'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Najnowsze',
  oldest: 'Najstarsze',
  az: 'A-Z',
  za: 'Z-A',
}

const SORT_OPTIONS: SortOption[] = ['newest', 'oldest', 'az', 'za']

function toMillis(input: unknown): number {
  if (!input) return 0
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? 0 : input.getTime()
  if (typeof input === 'object') {
    const maybe = input as { toDate?: () => Date; seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number }
    if (typeof maybe.toDate === 'function') {
      const d = maybe.toDate()
      return Number.isNaN(d.getTime()) ? 0 : d.getTime()
    }
    const seconds = typeof maybe.seconds === 'number' ? maybe.seconds : typeof maybe._seconds === 'number' ? maybe._seconds : null
    const nanos = typeof maybe.nanoseconds === 'number' ? maybe.nanoseconds : typeof maybe._nanoseconds === 'number' ? maybe._nanoseconds : 0
    if (seconds !== null) return seconds * 1000 + Math.floor(nanos / 1e6)
  }
  const d = new Date(input as string | number)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

function sortArticles(list: Article[], sort: SortOption): Article[] {
  const copy = [...list]
  if (sort === 'az') return copy.sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'za') return copy.sort((a, b) => b.title.localeCompare(a.title))
  const getTime = (a: Article) => toMillis(a.publishedAt ?? a.createdAt)
  if (sort === 'oldest') return copy.sort((a, b) => getTime(a) - getTime(b))
  return copy.sort((a, b) => getTime(b) - getTime(a))
}

function ProfessionalBlogContent() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      if (searchQuery) {
        const results = await searchArticles(searchQuery, 'professional')
        setArticles(results)
      } else {
        const { articles: fetchedArticles } = await getArticles({
          targetAudience: 'professional',
        })
        setArticles(fetchedArticles)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setIsSortOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const visibleArticles = useMemo(() => {
    return sortArticles(articles, sortOption)
  }, [articles, sortOption])

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="pb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/40">
              Blog dla Specjalistow
            </p>
            <h1 className="mt-4 text-[clamp(1.9rem,5vw,3.1rem)] font-semibold leading-[1.02] tracking-tight text-black">
              Artykuly kliniczne
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55 sm:text-[15px]">
              Podsumowania kliniczne, badania i przypadki dla profesjonalistow medycznych.
            </p>
          </div>
          {user && (
            <div className="hidden shrink-0 items-center gap-2 rounded-full bg-black/[0.03] px-3 py-1.5 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-black/50">{user.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-black/40">
            {loading ? 'Ladowanie artykulow' : `${visibleArticles.length} artykulow`}
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <SearchBar onSearch={handleSearch} className="w-full sm:min-w-[20rem] sm:max-w-sm" />
            <div className="flex items-center gap-1.5">
              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSortOpen((prev) => !prev)
                  }}
                  title={`Sortowanie: ${SORT_LABELS[sortOption]}`}
                  className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[15px] font-medium text-black transition-colors hover:bg-black/[0.04]"
                >
                  Sortuj
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {isSortOpen && (
                  <div className="absolute right-0 z-20 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-black/[0.1] bg-white py-1 shadow-[0_10px_25px_-12px_rgba(0,0,0,0.24)]">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSortOption(option)
                          setIsSortOpen(false)
                        }}
                        className={cn(
                          'block w-full px-3 py-2 text-left text-[14px] transition-colors hover:bg-black/[0.04]',
                          sortOption === option ? 'font-medium text-black' : 'text-black/70'
                        )}
                      >
                        {SORT_LABELS[option]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="ml-0.5 flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Widok siatki"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                    viewMode === 'grid'
                      ? 'text-black'
                      : 'text-black/30 hover:bg-black/[0.04] hover:text-black/70'
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Widok listy"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                    viewMode === 'list'
                      ? 'text-black'
                      : 'text-black/30 hover:bg-black/[0.04] hover:text-black/70'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ArticleGrid
        articles={visibleArticles}
        loading={loading}
        basePath="/professional"
        viewMode={viewMode}
      />

      <div className="mt-14 pt-10">
        <div className="max-w-lg">
          <NewsletterForm variant="card" />
        </div>
      </div>

      {!loading && visibleArticles.length > 0 && (
        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            className="h-10 rounded-full border-black/[0.1] px-6 text-xs font-medium text-black/50 hover:border-black/20 hover:text-black"
          >
            Zaladuj wiecej
          </Button>
        </div>
      )}
    </div>
  )
}

export default function ProfessionalBlogPage() {
  return (
    <ProtectedRoute requireApproved>
      <ProfessionalBlogContent />
    </ProtectedRoute>
  )
}
