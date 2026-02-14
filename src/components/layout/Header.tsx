'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, X, User, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

const siteNav = [
  { label: 'Start', href: '/' },
  { label: 'Blog dla Pacjentow', href: '/patient' },
  { label: 'Blog dla Specjalistow', href: '/professional' },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, loading, isDemoMode } = useAuth()

  const handleSignOut = async () => {
    if (!isDemoMode) {
      const { signOut } = await import('@/lib/firebase/auth')
      await signOut()
    }
    setUserMenuOpen(false)
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white">
      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="bg-yellow-100 px-4 py-1 text-center text-xs text-yellow-800">
          Tryb demo - skonfiguruj Firebase w .env.local dla pelnej funkcjonalnosci
        </div>
      )}

      <nav className="flex w-full items-center justify-between px-0 py-4">
        <div className="flex items-center">
          {!loading && (
            <button
              className="mr-3 sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Zamknij menu' : 'Otworz menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-semibold tracking-tight text-black">Skrzypecki Blog</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-full border border-black/10 bg-white p-2 text-black/80 hover:bg-black/5"
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
                  <Button variant="ghost" className="rounded-full text-black" asChild>
                    <Link href="/login">Zaloguj</Link>
                  </Button>
                  <Button className="rounded-full bg-black text-white hover:bg-black/80" asChild>
                    <Link href="/register">Rejestracja</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" className="absolute left-0 top-0 h-full w-full bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="text-base font-semibold text-black">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Zamknij menu">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="px-4 py-4">
              <div className="space-y-3 text-sm text-black/70">
                {siteNav.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block text-black/80 transition-colors hover:text-black"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="border-t border-border px-4 py-4">
              {user ? (
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      Panel
                    </Link>
                  </Button>
                  {user.role === 'admin' && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                        Admin
                      </Link>
                    </Button>
                  )}
                  <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                    Wyloguj
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1 rounded-full" asChild>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      Zaloguj
                    </Link>
                  </Button>
                  <Button className="flex-1 rounded-full bg-foreground text-background hover:bg-foreground/80" asChild>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      Rejestracja
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
