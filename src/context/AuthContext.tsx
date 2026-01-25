'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase/config'
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
  const isDemoMode = !isFirebaseConfigured

  useEffect(() => {
    // Demo mode - no Firebase configured
    if (isDemoMode) {
      setLoading(false)
      return
    }

    // Firebase mode
    const { onAuthStateChanged } = require('firebase/auth')
    const { auth } = require('@/lib/firebase/config')

    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      setFirebaseUser(fbUser)

      if (fbUser && db) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
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
          console.error('Error fetching user data:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [isDemoMode])

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
