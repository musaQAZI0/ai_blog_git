'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Skeleton } from '@/components/ui'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireApproved?: boolean
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireApproved = true,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isApproved } = useAuth()
  const router = useRouter()
  const redirected = useRef(false)

  useEffect(() => {
    if (!loading && !redirected.current) {
      if (!user) {
        redirected.current = true
        router.replace('/login')
        return
      }

      if (requireApproved && !isApproved) {
        redirected.current = true
        router.replace('/pending-approval')
        return
      }

      if (requireAdmin && !isAdmin) {
        redirected.current = true
        router.replace('/dashboard')
        return
      }
    }
  }, [user, loading, isAdmin, isApproved, requireAdmin, requireApproved, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    )
  }

  // Return null while redirect is in progress — navigation is already queued
  if (!user) return null
  if (requireApproved && !isApproved) return null
  if (requireAdmin && !isAdmin) return null

  return <>{children}</>
}
