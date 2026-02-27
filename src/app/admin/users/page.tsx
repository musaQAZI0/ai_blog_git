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
  Input,
  Select,
} from '@/components/ui'
import { User, UserStatus } from '@/types'
import { ArrowLeft, Search, Trash2, Edit } from 'lucide-react'
import { formatDate } from '@/lib/utils'

function AdminUsersContent() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchQuery) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchQuery, statusFilter])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users/list')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load users')
      setUsers(json.users)
      setFilteredUsers(json.users)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Czy na pewno chcesz usunac tego uzytkownika?')) return

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Delete failed')
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Zatwierdzony</Badge>
      case 'pending':
        return <Badge variant="warning">Oczekujacy</Badge>
      case 'rejected':
        return <Badge variant="destructive">Odrzucony</Badge>
    }
  }

  const getProfessionalTypeLabel = (user: User) =>
    user.professionalType === 'lekarz'
      ? 'Lekarz'
      : user.professionalType === 'optometrysta'
        ? 'Optometrysta'
        : user.otherProfessionalType || 'Inny'

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrot do panelu
        </Link>
        <h1 className="text-3xl font-bold">Zarzadzanie uzytkownikami</h1>
        <p className="mt-1 text-muted-foreground">
          Przegladaj i zarzadzaj kontami uzytkownikow
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj po nazwie lub emailu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
            options={[
              { value: 'all', label: 'Wszystkie statusy' },
              { value: 'approved', label: 'Zatwierdzeni' },
              { value: 'pending', label: 'Oczekujacy' },
              { value: 'rejected', label: 'Odrzuceni' },
            ]}
            className="w-full sm:w-48"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uzytkownicy ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Ladowanie...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-muted-foreground">Nie znaleziono uzytkownikow</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="rounded-lg border bg-muted/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      {getStatusBadge(user.status)}
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p>Typ: {getProfessionalTypeLabel(user)}</p>
                      <p>PWZ: {user.registrationNumber || '-'}</p>
                      <p>Rejestracja: {formatDate(user.createdAt)}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" className="flex-1" size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Edytuj
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usun
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[840px]">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Nazwa</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Typ</th>
                      <th className="pb-3 font-medium">PWZ</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Data rejestracji</th>
                      <th className="pb-3 font-medium">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="py-3">{user.name}</td>
                        <td className="py-3">{user.email}</td>
                        <td className="py-3">{getProfessionalTypeLabel(user)}</td>
                        <td className="py-3">{user.registrationNumber || '-'}</td>
                        <td className="py-3">{getStatusBadge(user.status)}</td>
                        <td className="py-3">{formatDate(user.createdAt)}</td>
                        <td className="py-3">
                          <div className="flex gap-2 whitespace-nowrap">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminUsersContent />
    </ProtectedRoute>
  )
}
