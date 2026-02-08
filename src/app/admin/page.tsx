'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription,
} from '@/components/ui'
import { PendingApproval } from '@/types'
import { useAuth } from '@/context/AuthContext'
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
} from 'lucide-react'

function AdminDashboardContent() {
  const { user } = useAuth()
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    approvedUsers: 0,
    totalArticles: 0,
    publishedArticles: 0,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/overview')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load overview')
      setPendingApprovals((json.pending as PendingApproval[]).filter((a: PendingApproval) => !a.reviewedAt))
      setStats(json.stats)
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approval: PendingApproval) => {
    if (!user) return
    setActionLoading(approval.userId)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: approval.userId,
          reviewerId: user.id,
          userEmail: approval.userData.email,
          userName: approval.userData.name,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Approval failed')
      setMessage({ type: 'success', text: 'Uzytkownik zostal zatwierdzony' })
      fetchData()
    } catch (error) {
      setMessage({ type: 'error', text: 'Blad zatwierdzania uzytkownika' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (approval: PendingApproval) => {
    if (!user) return
    setActionLoading(approval.userId)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/users/reject', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: approval.userId,
          reviewerId: user.id,
          userEmail: approval.userData.email,
          userName: approval.userData.name,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Reject failed')
      setMessage({ type: 'success', text: 'Uzytkownik zostal odrzucony' })
      fetchData()
    } catch (error) {
      setMessage({ type: 'error', text: 'Blad odrzucania uzytkownika' })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Panel administratora</h1>
        <p className="mt-1 text-muted-foreground">
          Zarzadzaj uzytkownikami i tresciami
        </p>
      </div>

      {message && (
        <Alert
          variant={message.type === 'success' ? 'success' : 'destructive'}
          className="mb-6"
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uzytkownicy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Oczekujacy</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingApprovals}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Zatwierdzeni</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.approvedUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Artykuly</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArticles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Opublikowane</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedArticles}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/users">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 p-6">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Zarzadzaj uzytkownikami</h3>
                <p className="text-sm text-muted-foreground">
                  Przegladaj i edytuj uzytkownikow
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/articles">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 p-6">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Zarzadzaj artykulami</h3>
                <p className="text-sm text-muted-foreground">
                  Moderuj i edytuj artykuly
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 p-6">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Ustawienia</h3>
                <p className="text-sm text-muted-foreground">
                  Konfiguracja systemu
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Oczekujacy na zatwierdzenie ({pendingApprovals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Ladowanie...</p>
          ) : pendingApprovals.length === 0 ? (
            <p className="text-muted-foreground">
              Brak oczekujacych zgloszen do zatwierdzenia
            </p>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div
                  key={approval.userId}
                  className="flex items-center justify-between rounded-lg border bg-muted/50 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{approval.userData.name}</span>
                      <Badge variant="secondary">
                        {approval.userData.professionalType === 'lekarz'
                          ? 'Lekarz'
                          : approval.userData.professionalType === 'optometrysta'
                          ? 'Optometrysta'
                          : approval.userData.otherProfessionalType || 'Inny'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {approval.userData.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PWZ/Nr rej.: {approval.userData.registrationNumber}
                    </p>
                    {approval.userData.specialization && (
                      <p className="text-sm text-muted-foreground">
                        Specjalizacja: {approval.userData.specialization}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(approval)}
                      disabled={actionLoading === approval.userId}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Odrzuc
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(approval)}
                      disabled={actionLoading === approval.userId}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Zatwierdz
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboardContent />
    </ProtectedRoute>
  )
}
