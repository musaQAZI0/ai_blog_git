import 'server-only'

import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

export type RequestUserRole = 'guest' | 'patient' | 'professional' | 'admin'

export type RequestUser = {
  role: RequestUserRole
  uid?: string
}

export async function getRequestUser(request: Request): Promise<RequestUser> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { role: 'guest' }
  }

  if (!isFirebaseAdminConfigured()) {
    // Cannot verify the token without Admin SDK; fall back to guest.
    return { role: 'guest' }
  }

  const token = authHeader.slice('bearer '.length).trim()
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const uid = decoded.uid

    const snap = await getAdminDb().collection('users').doc(uid).get()
    const role = (snap.exists ? (snap.data()?.role as RequestUserRole | undefined) : undefined) || 'patient'

    if (role !== 'patient' && role !== 'professional' && role !== 'admin') {
      return { role: 'patient', uid }
    }
    return { role, uid }
  } catch {
    return { role: 'guest' }
  }
}

