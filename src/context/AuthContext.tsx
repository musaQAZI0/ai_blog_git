'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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
      try {
        const firebaseConfig = await import('@/lib/firebase/config.client')
        const configured = await firebaseConfig.ensureFirebaseInitialized()
        if (cancelled) return

        if (!configured) {
          setIsDemoMode(true)
          setLoading(false)
          return
        }

        setIsDemoMode(false)

        const [{ onAuthStateChanged }, { doc, getDoc }] = await Promise.all([
          import('firebase/auth'),
          import('firebase/firestore'),
        ])

        const firebaseAuth = firebaseConfig.auth
        if (!firebaseAuth) {
          setLoading(false)
          return
        }
        const firestoreDb = firebaseConfig.db

        unsubscribe = onAuthStateChanged(
          firebaseAuth,
          async (fbUser: FirebaseUser | null) => {
            if (cancelled) return
            setFirebaseUser(fbUser)

            if (fbUser && firestoreDb) {
              try {
                const userDoc = await getDoc(doc(firestoreDb, 'users', fbUser.uid))
                if (cancelled) return

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
                const err = error as { code?: string }
                if (err?.code === 'permission-denied') {
                  console.error(
                    '[auth] Firestore permission denied while reading users/{uid}. ' +
                      "This usually means your deployed Firestore rules do not match this repo's firestore.rules, " +
                      'or your Firebase config points to a different project. Deploy rules with: `firebase deploy --only firestore:rules`.',
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
          }
        )
      } catch (error) {
        if (cancelled) return
        console.error('[auth] initialization error:', error)
        setIsDemoMode(true)
        setUser(null)
        setFirebaseUser(null)
        setLoading(false)
      }
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
