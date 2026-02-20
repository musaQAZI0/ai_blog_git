'use client'

import React from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui'
import { ArrowLeft, Settings } from 'lucide-react'

function AdminSettingsContent() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrot do panelu
        </Link>
        <h1 className="text-3xl font-bold">Ustawienia systemu</h1>
        <p className="mt-1 text-muted-foreground">
          Konfiguracja panelu administratora
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Ustawienia
          </CardTitle>
          <CardDescription>
            Ta sekcja jest w przygotowaniu. Wróci tu konfiguracja systemu, AI i powiadomień.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">
            Na ten moment ustawienia sa zarzadzane przez pliki konfiguracyjne i zmienne srodowiskowe.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/admin/users">Zarządzaj użytkownikami</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/articles">Zarządzaj artykulami</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminSettingsContent />
    </ProtectedRoute>
  )
}
