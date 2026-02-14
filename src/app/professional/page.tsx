'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Article } from '@/types'
import { getArticles, searchArticles } from '@/lib/firebase/articles'
import { ArticleGrid } from '@/components/blog/ArticleGrid'
import { SearchBar } from '@/components/blog/SearchBar'
import { CategoryFilter } from '@/components/blog/CategoryFilter'
import { NewsletterForm } from '@/components/blog/NewsletterForm'
import {
  Button,
  Alert,
  AlertDescription,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowUpDown, ChevronDown, SlidersHorizontal } from 'lucide-react'

const CATEGORIES = [
  'Kliniczna',
  'Badania',
  'Techniki operacyjne',
  'Farmakologia',
  'Przypadki',
]

const SIDE_NAV = [
  { label: 'Start', href: '/' },
  { label: 'Blog dla Pacjentow', href: '/patient' },
  { label: 'Blog dla Specjalistow', href: '/professional' },
]

type SortOption = 'newest' | 'oldest' | 'az' | 'za'

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

  if (sort === 'az') {
    return copy.sort((a, b) => a.title.localeCompare(b.title))
  }
  if (sort === 'za') {
    return copy.sort((a, b) => b.title.localeCompare(a.title))
  }

  const getTime = (a: Article) => toMillis(a.publishedAt ?? a.createdAt)
  if (sort === 'oldest') {
    return copy.sort((a, b) => getTime(a) - getTime(b))
  }
  return copy.sort((a, b) => getTime(b) - getTime(a))
}

function ProfessionalBlogContent() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('newest')
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
          category: selectedCategory || undefined,
        })
        setArticles(fetchedArticles)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery])

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

  return (
    <div className="w-full px-0 py-12">
      <div className="flex-1">
          {user && (
            <Alert variant="info" className="mb-6">
              <AlertDescription>
                Witaj, {user?.name}! Jestes zalogowany jako{' '}
                {user?.professionalType === 'lekarz'
                  ? 'Lekarz'
                  : user?.professionalType === 'optometrysta'
                  ? 'Optometrysta'
                  : 'Specjalista'}
                .
              </AlertDescription>
            </Alert>
          )}

          {/* Header */}
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-black/60">Blog</p>
            <h1 className="mt-3 text-4xl font-semibold text-black">Wszystkie</h1>
            <p className="mt-3 text-base text-black/70">
              Artykuly kliniczne, badania i przypadki dla profesjonalistow
            </p>
          </div>

          <div className="mb-8 flex flex-wrap items-center gap-4">
            <CategoryFilter
              categories={CATEGORIES}
              selectedCategory={selectedCategory}
              onSelect={handleCategorySelect}
            />
            <div className="ml-auto flex items-center gap-2 pr-2 text-black/70">
              <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 hover:text-black">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtr
                    <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Filtruj</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={selectedCategory === null ? 'default' : 'outline'}
                      onClick={() => {
                        handleCategorySelect(null)
                        setFilterOpen(false)
                      }}
                    >
                      Wszystkie
                    </Button>
                    {CATEGORIES.map((cat) => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        onClick={() => {
                          handleCategorySelect(cat)
                          setFilterOpen(false)
                        }}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={sortOpen} onOpenChange={setSortOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 hover:text-black">
                    <ArrowUpDown className="h-4 w-4" />
                    Sortuj
                    <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Sortuj</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <Button
                      variant={sortOption === 'newest' ? 'default' : 'outline'}
                      onClick={() => {
                        setSortOption('newest')
                        setSortOpen(false)
                      }}
                    >
                      Najnowsze
                    </Button>
                    <Button
                      variant={sortOption === 'oldest' ? 'default' : 'outline'}
                      onClick={() => {
                        setSortOption('oldest')
                        setSortOpen(false)
                      }}
                    >
                      Najstarsze
                    </Button>
                    <Button
                      variant={sortOption === 'az' ? 'default' : 'outline'}
                      onClick={() => {
                        setSortOption('az')
                        setSortOpen(false)
                      }}
                    >
                      A–Z
                    </Button>
                    <Button
                      variant={sortOption === 'za' ? 'default' : 'outline'}
                      onClick={() => {
                        setSortOption('za')
                        setSortOpen(false)
                      }}
                    >
                      Z–A
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mb-6">
            <SearchBar onSearch={handleSearch} />
          </div>

          <ArticleGrid
            articles={articles}
            loading={loading}
            basePath="/professional"
          />

          <div className="mt-10 max-w-lg">
            <NewsletterForm variant="card" />
          </div>

          {!loading && articles.length > 0 && (
            <div className="mt-10 flex justify-center">
              <Button variant="outline">Zaladuj wiecej</Button>
            </div>
          )}
      </div>
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
