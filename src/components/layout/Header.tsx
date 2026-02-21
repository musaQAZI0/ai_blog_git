'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, User, LogOut, Settings, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const siteNav = [
  { label: 'Pacjenci', href: '/patient' },
  { label: 'Specjalisci', href: '/professional' },
]

export function Header() {
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, loading, isDemoMode } = useAuth()
  const pathname = usePathname()
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Prevent hydration mismatch — only render auth UI after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

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
      {mounted && isDemoMode && (
        <div className="bg-amber-50 px-4 py-1.5 text-center text-[11px] text-amber-600">
          Tryb demo — skonfiguruj Firebase w .env.local
        </div>
      )}

      <nav className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link href="/patient" className="flex items-center">
            <span className="text-[17px] font-semibold tracking-tight text-black">
              Skrzypecki
            </span>
            <span className="ml-1.5 text-[17px] font-semibold tracking-tight text-black">
              Blog
            </span>
          </Link>
        </div>

        {/* Center: Nav links */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 sm:flex">
          {siteNav.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[13px] transition-colors',
                  isActive
                    ? 'font-medium text-black'
                    : 'text-black/40 hover:text-black/70'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Right: Auth */}
        <div className="flex items-center gap-2">
          {mounted && !loading && (
            <>
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors',
                      userMenuOpen ? 'bg-black/[0.04]' : 'hover:bg-black/[0.03]'
                    )}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-medium text-white">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                    <span className="hidden text-[13px] text-black/60 md:block">{user.name}</span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-56 overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
                      <div className="border-b border-black/[0.05] px-4 py-2.5">
                        <p className="text-[13px] font-medium text-black">{user.name}</p>
                        <p className="mt-0.5 text-[11px] text-black/40">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Panel
                        </Link>
                        {user.role === 'admin' && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings className="h-3.5 w-3.5" />
                            Admin
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-black/[0.05] pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-red-500/70 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Wyloguj
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden items-center gap-1.5 sm:flex">
                  <Link
                    href="/login"
                    className="rounded-full px-4 py-1.5 text-[13px] text-black/50 transition-colors hover:text-black"
                  >
                    Zaloguj
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-full bg-black px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-black/80"
                  >
                    Rejestracja
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile hamburger */}
          {mounted && !loading && (
            <button
              className="ml-1 rounded-lg p-1.5 text-black/50 transition-colors hover:bg-black/[0.04] hover:text-black sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Zamknij menu' : 'Otworz menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            className="absolute right-0 top-0 h-full w-full max-w-[320px] bg-white shadow-[-8px_0_30px_-12px_rgba(0,0,0,0.1)]"
          >
            {/* Close */}
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-[13px] font-medium text-black/40">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1 text-black/40 hover:text-black"
                aria-label="Zamknij menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="px-3 py-2">
              {siteNav.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] transition-colors',
                      isActive
                        ? 'font-medium text-black'
                        : 'text-black/45 hover:bg-black/[0.03] hover:text-black/70'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                    <ChevronRight className="h-3.5 w-3.5 text-black/20" />
                  </Link>
                )
              })}
            </nav>

            {/* Auth section */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-black/[0.06] px-5 py-5">
              {user ? (
                <div className="space-y-2">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-medium text-white">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-black">{user.name}</p>
                      <p className="text-[11px] text-black/35">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    className="block rounded-lg px-3 py-2 text-[13px] text-black/55 transition-colors hover:bg-black/[0.03]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Panel
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="block rounded-lg px-3 py-2 text-[13px] text-black/55 transition-colors hover:bg-black/[0.03]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-red-500/60 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    Wyloguj
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    className="flex-1 rounded-full border border-black/[0.1] py-2 text-center text-[13px] text-black/60 transition-colors hover:border-black/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Zaloguj
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 rounded-full bg-black py-2 text-center text-[13px] font-medium text-white transition-colors hover:bg-black/80"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Rejestracja
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
