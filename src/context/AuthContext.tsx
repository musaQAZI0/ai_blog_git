'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, ensureFirebaseInitialized } from '@/lib/firebase/config.client'
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

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(true)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null

    ;(async () => {
      setLoading(true)
      const configured = await ensureFirebaseInitialized()
      if (cancelled) return

      if (!configured) {
        console.log('[auth] demo mode enabled (Firebase not configured)')
        setIsDemoMode(true)
        setLoading(false)
        return
      }

      setIsDemoMode(false)

      const { onAuthStateChanged } = await import('firebase/auth')
      if (!auth) {
        setLoading(false)
        return
      }

      unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        console.log('[auth] onAuthStateChanged', { uid: fbUser?.uid || null })
        setFirebaseUser(fbUser)

        if (fbUser && db) {
          try {
            const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              console.log('[auth] user doc loaded', { status: userData.status, role: userData.role })
              setUser({
                id: userDoc.id,
                ...userData,
                createdAt: userData.createdAt?.toDate() || new Date(),
                updatedAt: userData.updatedAt?.toDate() || new Date(),
                gdprConsentDate: userData.gdprConsentDate?.toDate(),
              } as User)
            } else {
              console.log('[auth] user doc missing for uid', fbUser.uid)
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
  }, [])

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
