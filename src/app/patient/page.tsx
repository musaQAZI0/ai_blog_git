'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Article } from '@/types'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { getMockArticles } from '@/lib/mock-data'
import { ArticleGrid } from '@/components/blog/ArticleGrid'
import { SearchBar } from '@/components/blog/SearchBar'
import { CategoryFilter } from '@/components/blog/CategoryFilter'
import { NewsletterForm } from '@/components/blog/NewsletterForm'
import { Button, Alert, AlertDescription } from '@/components/ui'

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
  const isDemoMode = !isFirebaseConfigured

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

        setArticles(mockArticles)
      } else {
        // Use Firebase
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
      // Fallback to mock data on error
      setArticles(getMockArticles('patient'))
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
