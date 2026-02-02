'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, User, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user, loading, isDemoMode } = useAuth()

  const navigation = [
    { name: 'Start', href: '/' },
    { name: 'Blog dla Pacjentow', href: '/patient' },
    { name: 'Blog dla Specjalistow', href: '/professional' },
  ]

  const handleSignOut = async () => {
    if (!isDemoMode) {
      const { signOut } = await import('@/lib/firebase/auth')
      await signOut()
    }
    setUserMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="bg-yellow-100 px-4 py-1 text-center text-xs text-yellow-800">
          Tryb demo - skonfiguruj Firebase w .env.local dla pelnej funkcjonalnosci
        </div>
      )}

      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">Skrzypecki</span>
            <span className="text-xl font-light">Blog</span>
          </Link>

          <div className="hidden md:flex md:gap-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === item.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-full bg-muted p-2 hover:bg-muted/80"
                  >
                    <User className="h-5 w-5" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md border bg-background py-1 shadow-lg">
                      <div className="border-b px-4 py-2">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Panel
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          Admin
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted"
                      >
                        <LogOut className="h-4 w-4" />
                        Wyloguj
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex md:gap-2">
                  <Button variant="ghost" asChild>
                    <Link href="/login">Zaloguj</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Rejestracja</Link>
                  </Button>
                </div>
              )}
            </>
          )}

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'block rounded-md px-3 py-2 text-base font-medium',
                  pathname === item.href
                    ? 'bg-muted text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {!user && (
              <div className="flex gap-2 pt-4">
                <Button variant="ghost" className="flex-1" asChild>
                  <Link href="/login">Zaloguj</Link>
                </Button>
                <Button className="flex-1" asChild>
                  <Link href="/register">Rejestracja</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
