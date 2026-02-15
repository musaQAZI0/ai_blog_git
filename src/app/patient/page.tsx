'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Article } from '@/types'
import { getMockArticles } from '@/lib/mock-data'
import { ArticleGrid } from '@/components/blog/ArticleGrid'
import { SearchBar } from '@/components/blog/SearchBar'
import { CategoryFilter } from '@/components/blog/CategoryFilter'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { ArrowUpDown } from 'lucide-react'

const CATEGORIES = [
  'Zdrowie oczu',
  'Choroby',
  'Leczenie',
  'Profilaktyka',
  'Soczewki',
]

type SortOption = 'newest' | 'oldest' | 'az' | 'za'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Najnowsze',
  oldest: 'Najstarsze',
  az: 'A–Z',
  za: 'Z–A',
}

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

export default function PatientBlogPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const { isDemoMode } = useAuth()

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoMode) {
        let mockArticles = getMockArticles('patient')
        if (searchQuery) {
          mockArticles = mockArticles.filter(
            (a) =>
              a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }
        if (selectedCategory) {
          mockArticles = mockArticles.filter((a) => a.category === selectedCategory)
        }
        setArticles(mockArticles)
      } else {
        const { getArticles, searchArticles } = await import('@/lib/firebase/articles')
        if (searchQuery) {
          const results = await searchArticles(searchQuery, 'patient')
          setArticles(results)
        } else {
          const { articles: fetchedArticles } = await getArticles({
            targetAudience: 'patient',
            category: selectedCategory || undefined,
          })
          setArticles(fetchedArticles)
        }
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
      setArticles(getMockArticles('patient'))
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery, isDemoMode])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  useEffect(() => {
    setArticles((prev) => sortArticles(prev, sortOption))
  }, [sortOption])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSelectedCategory(null)
  }

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category)
    setSearchQuery('')
  }

  const cycleSortOption = () => {
    const options: SortOption[] = ['newest', 'oldest', 'az', 'za']
    const currentIndex = options.indexOf(sortOption)
    setSortOption(options[(currentIndex + 1) % options.length])
  }

  return (
    <div className="mx-auto max-w-[980px] py-8">
      {/* Header */}
      <div className="pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/40">
          Blog dla Pacjentów
        </p>
        <h1 className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-[1.1] tracking-tight text-black">
          Zdrowie oczu
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/50">
          Przystepne artykuly o zdrowiu oczu, chorobach i profilaktyce okulistycznej.
        </p>
      </div>

      {/* Toolbar */}
      <div className="border-t border-black/[0.06] pt-6 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CategoryFilter
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
          />
          <div className="flex items-center gap-3">
            <SearchBar onSearch={handleSearch} />
            <button
              type="button"
              onClick={cycleSortOption}
              className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs text-black/40 transition-colors hover:border-black/15 hover:text-black/60"
            >
              <ArrowUpDown className="h-3 w-3" />
              {SORT_LABELS[sortOption]}
            </button>
          </div>
        </div>
      </div>

      {/* Articles */}
      <ArticleGrid
        articles={articles}
        loading={loading}
        basePath="/patient"
      />

      {!loading && articles.length > 0 && (
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
