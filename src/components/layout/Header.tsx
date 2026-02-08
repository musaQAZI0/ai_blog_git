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
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="bg-yellow-100 px-4 py-1 text-center text-xs text-yellow-800">
          Tryb demo - skonfiguruj Firebase w .env.local dla pelnej funkcjonalnosci
        </div>
      )}

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-foreground">Skrzypecki</span>
            <span className="text-lg font-light text-foreground">Blog</span>
          </Link>

          <div className="hidden md:flex md:gap-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  pathname === item.href
                    ? 'text-foreground'
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
                    className="flex items-center gap-2 rounded-full bg-muted p-2 text-foreground/80 hover:bg-muted/70"
                  >
                    <User className="h-5 w-5" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-card py-1 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.2)]">
                      <div className="border-b border-border/70 px-4 py-2">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Panel
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-muted"
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
                  <Button variant="ghost" className="rounded-full" asChild>
                    <Link href="/login">Zaloguj</Link>
                  </Button>
                  <Button className="rounded-full bg-foreground text-background hover:bg-foreground/80" asChild>
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
        <div className="md:hidden border-t border-border bg-background/95">
          <div className="space-y-1 px-4 pb-4 pt-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'block rounded-md px-3 py-2 text-base font-medium',
                  pathname === item.href
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {!user && (
              <div className="flex gap-2 pt-4">
                <Button variant="ghost" className="flex-1 rounded-full" asChild>
                  <Link href="/login">Zaloguj</Link>
                </Button>
                <Button className="flex-1 rounded-full bg-foreground text-background hover:bg-foreground/80" asChild>
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
