'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Article } from '@/types'
import { getMockArticles } from '@/lib/mock-data'
import { ArticleGrid } from '@/components/blog/ArticleGrid'
import { SearchBar } from '@/components/blog/SearchBar'
import { CategoryFilter } from '@/components/blog/CategoryFilter'
import { NewsletterForm } from '@/components/blog/NewsletterForm'
import { Button, Alert, AlertDescription } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

const GOOGLE_ARTICLE: Article = {
  id: 'google-vision-health',
  title: 'Jak Google pomaga w ochronie wzroku: AI w diagnostyce oczu',
  slug: 'google-ai-ochrona-wzroku',
  content:
    'Sztuczna inteligencja wspierana przez Google pomaga okulistom szybciej wykrywać retinopatie i choroby siatkówki. W artykule omawiamy, jak algorytmy analizy obrazu wspierają diagnostykę, na co zwracać uwagę w profilaktyce i jak pacjent może przygotować się do wizyty. Korzystaj z regularnych badań i pamiętaj o higienie pracy przy ekranie.',
  excerpt:
    'Google rozwija AI do wczesnego wykrywania chorób oczu. Sprawdź, jak technologie pomagają w diagnostyce i profilaktyce wzroku.',
  coverImage: undefined,
  category: 'Zdrowie oczu',
  targetAudience: 'patient',
  authorId: 'system',
  authorName: 'Medical Blog AI',
  status: 'published',
  seoMeta: {
    title: 'Google AI i zdrowie oczu',
    description: 'Jak Google AI wspiera diagnostykę chorób oczu i profilaktykę wzroku.',
    keywords: ['google', 'AI', 'wzrok', 'diagnostyka', 'profilaktyka'],
  },
  createdAt: new Date('2024-03-01T00:00:00.000Z'),
  updatedAt: new Date('2024-03-01T00:00:00.000Z'),
  publishedAt: new Date('2024-03-01T00:00:00.000Z'),
  viewCount: 0,
  tags: ['AI', 'Google', 'zdrowie oczu'],
}

const CATEGORIES = [
  'Zdrowie oczu',
  'Choroby',
  'Leczenie',
  'Profilaktyka',
  'Soczewki',
]

export default function PatientBlogPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { isDemoMode } = useAuth()

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoMode) {
        // Use mock data in demo mode
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

        setArticles([GOOGLE_ARTICLE, ...mockArticles])
      } else {
        // Use Firebase
        const { getArticles, searchArticles } = await import('@/lib/firebase/articles')

        if (searchQuery) {
          const results = await searchArticles(searchQuery, 'patient')
          setArticles([GOOGLE_ARTICLE, ...results])
        } else {
          const { articles: fetchedArticles } = await getArticles({
            targetAudience: 'patient',
            category: selectedCategory || undefined,
          })
          setArticles([GOOGLE_ARTICLE, ...fetchedArticles])
        }
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
      // Fallback to mock data on error
      setArticles([GOOGLE_ARTICLE, ...getMockArticles('patient')])
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery, isDemoMode])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSelectedCategory(null)
  }

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category)
    setSearchQuery('')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <Alert variant="info" className="mb-6">
          <AlertDescription>
            Tryb demo - wyswietlane sa przykladowe artykuly. Skonfiguruj Firebase, aby uzyc pelnej funkcjonalnosci.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Blog dla Pacjentow</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Przystepne artykuly o zdrowiu oczu i profilaktyce okulistycznej
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        <SearchBar onSearch={handleSearch} />
        <CategoryFilter
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelect={handleCategorySelect}
        />
      </div>

      {/* Articles Grid */}
      <div className="grid gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ArticleGrid
            articles={articles}
            loading={loading}
            basePath="/patient"
          />

          {!loading && articles.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline">Zaladuj wiecej</Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <NewsletterForm variant="card" />

          <div className="rounded-lg border bg-muted/50 p-6">
            <h3 className="mb-4 font-semibold">Popularne tematy</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCategorySelect(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
