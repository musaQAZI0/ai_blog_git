'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from '@/components/ui'
import { doc, updateDoc } from 'firebase/firestore'
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config.client'
import { ArrowLeft, Save, Download, Trash2 } from 'lucide-react'

function DashboardSettingsContent() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [name, setName] = useState(user?.name || '')
  const [specialization, setSpecialization] = useState(user?.specialization || '')

  const handleSaveProfile = async () => {
    if (!user) return

    const configured = await ensureFirebaseInitialized()
    if (!configured || !db) {
      setMessage({ type: 'success', text: 'Demo mode - zmiany nie zostały zapisane' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      await updateDoc(doc(db, 'users', user.id), {
        name,
        specialization,
        updatedAt: new Date(),
      })
      setMessage({ type: 'success', text: 'Profil został zaktualizowany' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd aktualizacji profilu' })
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    if (!user) return
    setLoading(true)

    try {
      const response = await fetch('/api/gdpr/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (data.success) {
        // Create downloadable file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `moje-dane-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        setMessage({ type: 'success', text: 'Dane zostały pobrane' })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd pobierania danych' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    const confirmation = prompt(
      'Wpisz swój adres email, aby potwierdzic usuniecie konta:'
    )

    if (confirmation !== user.email) {
      setMessage({ type: 'error', text: 'Email nie pasuje. Konto nie zostało usunięte.' })
      return
    }

    if (!confirm('Czy na pewno chcesz usunąć swóje konto? Ta operacja jest nieodwracalna.')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/gdpr/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, confirmEmail: user.email }),
      })

      const data = await response.json()

      if (data.success) {
        // Sign out and redirect
        window.location.href = '/'
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd usuwania konta' })
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrot do panelu
        </Link>
        <h1 className="text-3xl font-bold">Ustawienia konta</h1>
        <p className="mt-1 text-muted-foreground">
          Zarządzaj swoim profilem i preferencjami
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

      {/* Profile Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Zaktualizuj swóje dane osobowe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ''} disabled />
            <p className="text-xs text-muted-foreground">
              Email nie może byc zmieniony
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Imie i nazwisko</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="professionalType">Typ specjalisty</Label>
            <Input
              id="professionalType"
              value={
                user?.professionalType === 'lekarz'
                  ? 'Lekarz'
                  : user?.professionalType === 'optometrysta'
                  ? 'Optometrysta'
                  : user?.otherProfessionalType || 'Inny'
              }
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Numer PWZ</Label>
            <Input
              id="registrationNumber"
              value={user?.registrationNumber || ''}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization">Specjalizacja</Label>
            <Input
              id="specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="np. Okulistyka"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Zapisz zmiany
          </Button>
        </CardContent>
      </Card>

      {/* GDPR */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Prywatnosc i dane (RODO)</CardTitle>
          <CardDescription>Zarządzaj swoimi danymi osobowymi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium">Eksport danych</h4>
              <p className="text-sm text-muted-foreground">
                Pobierz wszystkie swóje dane w formacie JSON
              </p>
            </div>
            <Button variant="outline" onClick={handleExportData} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Pobierz
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium text-destructive">Usun konto</h4>
              <p className="text-sm text-muted-foreground">
                Trwale usun swóje konto i wszystkie dane
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usun konto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardSettingsPage() {
  return (
    <ProtectedRoute requireApproved>
      <DashboardSettingsContent />
    </ProtectedRoute>
  )
}
