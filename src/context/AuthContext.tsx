'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { User as FirebaseUser } from 'firebase/auth'
import { User } from '@/types'

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: User | null
  loading: boolean
  isAdmin: boolean
  isApproved: boolean
  isDemoMode: boolean
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
  isAdmin: false,
  isApproved: false,
  isDemoMode: true,
})

const AUTH_HINT_COOKIE = 'app_auth_hint'
const AUTH_INIT_PATHS = ['/dashboard', '/admin', '/patient/generate', '/professional']

function setAuthHintCookie(enabled: boolean) {
  if (typeof document === 'undefined') return

  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = enabled
    ? `${AUTH_HINT_COOKIE}=1; Path=/; Max-Age=604800; SameSite=Lax${secureFlag}`
    : `${AUTH_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
}

function hasAuthHintCookie() {
  if (typeof document === 'undefined') return false
  return document.cookie
    .split(';')
    .some((cookie) => cookie.trim().startsWith(`${AUTH_HINT_COOKIE}=`))
}

function shouldInitializeAuth(pathname: string | null) {
  if (!pathname) return false
  return AUTH_INIT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname === '/login' && hasAuthHintCookie()
}

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(true)

  useEffect(() => {
    if (!shouldInitializeAuth(pathname)) {
      setFirebaseUser(null)
      setUser(null)
      setIsDemoMode(false)
      setLoading(false)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    ;(async () => {
      setLoading(true)
      const firebaseConfig = await import('@/lib/firebase/config.client')
      const configured = await firebaseConfig.ensureFirebaseInitialized()
      if (cancelled) return

      if (!configured) {
        setIsDemoMode(true)
        setLoading(false)
        return
      }

      setIsDemoMode(false)

      const { onAuthStateChanged } = await import('firebase/auth')
      const { doc, getDoc } = await import('firebase/firestore')
      const firebaseAuth = firebaseConfig.auth
      if (!firebaseAuth) {
        setLoading(false)
        return
      }
      const firestore = firebaseConfig.db

      unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser: FirebaseUser | null) => {
        setFirebaseUser(fbUser)
        setAuthHintCookie(Boolean(fbUser))

        if (fbUser && firestore) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', fbUser.uid))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              setUser({
                id: userDoc.id,
                ...userData,
                createdAt: userData.createdAt?.toDate() || new Date(),
                updatedAt: userData.updatedAt?.toDate() || new Date(),
                gdprConsentDate: userData.gdprConsentDate?.toDate(),
              } as User)
            } else {
              setUser(null)
            }
          } catch (error) {
            const err = error as any
            if (err?.code === 'permission-denied') {
              console.error(
                '[auth] Firestore permission denied while reading users/{uid}. ' +
                  'This usually means your deployed Firestore rules do not match this repo\'s firestore.rules, ' +
                  "or your Firebase config points to a different project. Deploy rules with: `firebase deploy --only firestore:rules`.",
                err
              )
            } else {
              console.error('[auth] error fetching user data:', err)
            }
            setUser(null)
          }
        } else {
          setUser(null)
        }

        setLoading(false)
      })
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [pathname])

  const isAdmin = user?.role === 'admin'
  const isApproved = user?.status === 'approved'

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        isAdmin,
        isApproved,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
