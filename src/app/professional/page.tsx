'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Article } from '@/types'
import { getArticles, searchArticles } from '@/lib/firebase/articles'
import { ArticleGrid } from '@/components/blog/ArticleGrid'
import { SearchBar } from '@/components/blog/SearchBar'
import { CategoryFilter } from '@/components/blog/CategoryFilter'
import { NewsletterForm } from '@/components/blog/NewsletterForm'
import { Button, Alert, AlertDescription } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

const CATEGORIES = [
  'Kliniczna',
  'Badania',
  'Techniki operacyjne',
  'Farmakologia',
  'Przypadki',
]

function ProfessionalBlogContent() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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
      {/* Welcome Banner */}
      <Alert variant="info" className="mb-8">
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

      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Blog dla Specjalistow Medycznych
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Artykuly kliniczne, badania i przypadki dla profesjonalistow
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
            basePath="/professional"
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
            <h3 className="mb-4 font-semibold">Specjalizacje</h3>
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

export default function ProfessionalBlogPage() {
  return (
    <ProtectedRoute requireApproved>
      <ProfessionalBlogContent />
    </ProtectedRoute>
  )
}
