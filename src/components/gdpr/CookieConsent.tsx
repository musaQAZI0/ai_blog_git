'use client'

import React, { useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { X, Settings } from 'lucide-react'

interface CookiePreferences {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
}

const COOKIE_CONSENT_KEY = 'cookie_consent'
const COOKIE_PREFERENCES_KEY = 'cookie_preferences'
const COOKIE_EXPIRY_DAYS = 365

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, can't be disabled
    functional: false,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Check if user has already consented
    const consent = Cookies.get(COOKIE_CONSENT_KEY)
    const savedPreferences = Cookies.get(COOKIE_PREFERENCES_KEY)

    if (!consent) {
      setShowBanner(true)
    } else if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences)
        setPreferences(prefs)
        // Initialize analytics if consented
        if (prefs.analytics) {
          initializeAnalytics()
        }
      } catch (e) {
        console.error('Failed to parse cookie preferences:', e)
      }
    }
  }, [])

  const initializeAnalytics = () => {
    if (typeof window !== 'undefined') {
      const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
      if (GA_ID && !document.querySelector(`script[src*="${GA_ID}"]`)) {
        const script = document.createElement('script')
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
        script.async = true
        document.head.appendChild(script)

        window.dataLayer = window.dataLayer || []
        const gtag = (...args: any[]) => {
          window.dataLayer.push(args)
        }
        gtag('js', new Date())
        gtag('config', GA_ID, {
          anonymize_ip: true,
          cookie_flags: 'SameSite=Lax;Secure',
        })
      }
    }
  }

  const savePreferences = async (prefs: CookiePreferences) => {
    Cookies.set(COOKIE_CONSENT_KEY, 'true', {
      expires: COOKIE_EXPIRY_DAYS,
      sameSite: 'Lax',
      secure: true,
    })
    Cookies.set(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs), {
      expires: COOKIE_EXPIRY_DAYS,
      sameSite: 'Lax',
      secure: true,
    })

    // Log consent to backend for GDPR compliance
    try {
      await fetch('/api/gdpr/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType: 'cookies',
          preferences: prefs,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('Failed to log consent:', error)
    }

    // Initialize analytics if consented
    if (prefs.analytics) {
      initializeAnalytics()
    }

    setShowBanner(false)
    setShowSettings(false)
  }

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    }
    savePreferences(allAccepted)
  }

  const acceptNecessaryOnly = () => {
    const necessaryOnly: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    }
    savePreferences(necessaryOnly)
  }

  const saveCustomPreferences = () => {
    savePreferences(preferences)
  }

  if (!showBanner) return null

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl rounded-lg border-2 bg-background shadow-xl">
          <div className="relative p-6">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Zamknij"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-3 text-lg font-semibold">Używamy plików cookie 🍪</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Używamy plików cookie i podobnych technologii, aby zapewnić prawidłowe funkcjonowanie
              strony, analizować ruch oraz personalizować treści. Możesz wybrać, które kategorie
              plików cookie chcesz zaakceptować.
            </p>

            {showSettings && (
              <div className="mb-4 space-y-3 rounded-lg bg-muted p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="necessary"
                    checked={preferences.necessary}
                    disabled
                    className="mt-1 cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <label htmlFor="necessary" className="text-sm font-medium">
                      Niezbędne (Wymagane)
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Pliki cookie niezbędne do podstawowego funkcjonowania strony, bezpieczeństwa i
                      uwierzytelniania.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="functional"
                    checked={preferences.functional}
                    onChange={(e) =>
                      setPreferences({ ...preferences, functional: e.target.checked })
                    }
                    className="mt-1 cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="functional" className="cursor-pointer text-sm font-medium">
                      Funkcjonalne
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Zapamiętują Twoje preferencje i ustawienia (np. język, rozmiar czcionki).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="analytics"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences({ ...preferences, analytics: e.target.checked })
                    }
                    className="mt-1 cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="analytics" className="cursor-pointer text-sm font-medium">
                      Analityczne
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Pomagają nam zrozumieć, jak korzystasz z naszej strony. Używamy Google Analytics
                      4 z anonimizacją IP.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="marketing"
                    checked={preferences.marketing}
                    onChange={(e) =>
                      setPreferences({ ...preferences, marketing: e.target.checked })
                    }
                    className="mt-1 cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="marketing" className="cursor-pointer text-sm font-medium">
                      Marketingowe
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Używane do personalizacji reklam i treści marketingowych.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={acceptAll} className="w-full sm:w-auto">
                  Akceptuj wszystkie
                </Button>
                <Button
                  onClick={acceptNecessaryOnly}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Tylko niezbędne
                </Button>
                {showSettings && (
                  <Button
                    onClick={saveCustomPreferences}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Zapisz wybrane
                  </Button>
                )}
              </div>
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="ghost"
                className="w-full sm:w-auto"
              >
                <Settings className="mr-2 h-4 w-4" />
                {showSettings ? 'Ukryj ustawienia' : 'Dostosuj'}
              </Button>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Więcej informacji w naszej{' '}
              <Link href="/privacy" className="underline hover:text-foreground">
                Polityce prywatności
              </Link>{' '}
              i{' '}
              <Link href="/cookies" className="underline hover:text-foreground">
                Polityce cookies
              </Link>
              .
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {showBanner && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" aria-hidden="true" />
      )}
    </>
  )
}

// Extend Window interface for gtag
declare global {
  interface Window {
    dataLayer: any[]
  }
}
