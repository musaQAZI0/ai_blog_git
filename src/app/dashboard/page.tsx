'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { getArticlesByAuthor } from '@/lib/firebase/articles'
import { Article } from '@/types'
import {
  PenSquare,
  FileText,
  Eye,
  Settings,
  Plus,
} from 'lucide-react'

function DashboardContent() {
  const { user, isAdmin } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserArticles() {
      if (!user) return
      if (!isAdmin) {
        setArticles([])
        setLoading(false)
        return
      }
      try {
        const userArticles = await getArticlesByAuthor(user.id)
        setArticles(userArticles)
      } catch (error) {
        console.error('Error fetching articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserArticles()
  }, [user, isAdmin])

  const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0)
  const publishedCount = articles.filter((a) => a.status === 'published').length
  const draftCount = articles.filter((a) => a.status === 'draft').length

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel użytkownika</h1>
          <p className="mt-1 text-muted-foreground">Witaj, {user?.name}</p>
        </div>
        {isAdmin ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/create">
              <Plus className="mr-2 h-4 w-4" />
              Nowy artykul
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie artykuly</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{articles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Opublikowane</CardTitle>
            <PenSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Wersje robocze</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Laczne wyswietlenia</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isAdmin ? (
          <>
            <Link href="/dashboard/create">
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Utworz artykul z AI</h3>
                    <p className="text-sm text-muted-foreground">Wgraj PDF i wygeneruj treść</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/articles">
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Moje artykuly</h3>
                    <p className="text-sm text-muted-foreground">Zarządzaj swoimi artykulami</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </>
        ) : (
          <Card className="sm:col-span-2 lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="font-semibold">Dostęp tylko do czytania</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tworzenie i edycja artykulow jest dostepne tylko dla administratora.
              </p>
            </CardContent>
          </Card>
        )}

        <Link href="/dashboard/settings">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Ustawienia</h3>
                <p className="text-sm text-muted-foreground">
                  Zarządzaj kontem i preferencjami
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Articles */}
      <Card>
        <CardHeader>
          <CardTitle>{isAdmin ? 'Ostatnie artykuly' : 'Konto'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            loading ? (
              <p className="text-muted-foreground">Ladowanie...</p>
            ) : articles.length === 0 ? (
              <p className="text-muted-foreground">
                Nie masz jeszcze zadnych artykulow.{' '}
                <Link href="/dashboard/create" className="text-primary hover:underline">
                  Utworz pierwszy artykul
                </Link>
              </p>
            ) : (
              <div className="space-y-4">
                {articles.slice(0, 5).map((article) => (
                  <div
                    key={article.id}
                    className="flex flex-col gap-3 border-b pb-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h4 className="font-medium">{article.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {article.status === 'published' ? 'Opublikowany' : 'Wersja robocza'} •{' '}
                        {article.viewCount} wyswietlen
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                      <Link href={`/dashboard/articles/${article.id}`}>Edytuj</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-muted-foreground">Uzyj ustawien, aby zaktualizowac profil i preferencje.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireApproved>
      <DashboardContent />
    </ProtectedRoute>
  )
}
