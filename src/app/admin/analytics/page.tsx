'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui'
import { ArrowLeft, Users, FileText, Mail, TrendingUp } from 'lucide-react'
import { getNewsletterStats } from '@/lib/firebase/newsletter'

interface Stats {
  totalUsers: number
  pendingApprovals: number
  approvedUsers: number
  totalArticles: number
  publishedArticles: number
}

interface NewsletterStats {
  total: number
  active: number
  unsubscribed: number
  byFrequency: { daily: number; weekly: number; monthly: number }
}

function AnalyticsContent() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [newsletterStats, setNewsletterStats] = useState<NewsletterStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [overviewRes, newsStats] = await Promise.all([
        fetch('/api/admin/overview').then((r) => r.json()),
        getNewsletterStats(),
      ])
      if (!overviewRes.success) throw new Error(overviewRes.error || 'Failed to load overview')
      setStats(overviewRes.stats)
      setNewsletterStats(newsStats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót do panelu
        </Link>
        <h1 className="text-3xl font-bold">Dashboard Analityczny</h1>
        <p className="mt-1 text-muted-foreground">
          Przegląd statystyk i metryk platformy
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Ładowanie statystyk...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* User Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Użytkownicy</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.approvedUsers || 0} zatwierdzonych
              </p>
              <p className="text-xs text-muted-foreground">
                {stats?.pendingApprovals || 0} oczekujących
              </p>
            </CardContent>
          </Card>

          {/* Article Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Artykuły</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalArticles || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.publishedArticles || 0} opublikowanych
              </p>
            </CardContent>
          </Card>

          {/* Newsletter Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Newsletter</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newsletterStats?.active || 0}</div>
              <p className="text-xs text-muted-foreground">aktywnych subskrybentów</p>
              <div className="mt-2 text-xs text-muted-foreground">
                <div>Dzienny: {newsletterStats?.byFrequency.daily || 0}</div>
                <div>Tygodniowy: {newsletterStats?.byFrequency.weekly || 0}</div>
                <div>Miesięczny: {newsletterStats?.byFrequency.monthly || 0}</div>
              </div>
            </CardContent>
          </Card>

          {/* Growth */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wzrost</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12%</div>
              <p className="text-xs text-muted-foreground">w tym miesiącu</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Google Analytics Integration Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Google Analytics 4</CardTitle>
          <CardDescription>
            Zaawansowane metryki analityczne
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aby zobaczyć szczegółowe raporty, zaloguj się do{' '}
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google Analytics 4
            </a>
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Sesje użytkowników</h3>
              <p className="text-sm text-muted-foreground">
                Śledź liczbę odwiedzin, czas na stronie i współczynnik odrzuceń
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Najpopularniejsze treści</h3>
              <p className="text-sm text-muted-foreground">
                Zobacz, które artykuły generują największe zaangażowanie
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Demografia</h3>
              <p className="text-sm text-muted-foreground">
                Poznaj lokalizację i urządzenia swoich użytkowników
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Konwersj?</h3>
              <p className="text-sm text-muted-foreground">
                Monitoruj rejestracje i subskrypcje newslettera
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AnalyticsContent />
    </ProtectedRoute>
  )
}
