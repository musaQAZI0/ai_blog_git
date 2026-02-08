import 'server-only'

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { PendingApproval, User } from '@/types'

function normalizePrivateKey(value: string): string {
  // Render/GitHub often store multiline private keys with escaped newlines.
  return value
    // First collapse any double-escaped backslashes.
    .replace(/\\\\/g, '\\')
    // Then turn \n sequences into real newlines.
    .replace(/\\n/g, '\n')
    .trim()
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
  )
}

function ensureAdminApp() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error('Firebase Admin is not configured.')
  }

  if (getApps().length) {
    return getApps()[0]!
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY!),
    }),
  })
}

export function getAdminAuth() {
  const app = ensureAdminApp()
  return getAuth(app)
}

export function getAdminDb() {
  const app = ensureAdminApp()
  return getFirestore(app)
}

// ---- Admin helpers used by dashboard APIs/pages ----

export async function getAdminStats() {
  const db = getAdminDb()
  const [usersSnap, articlesSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('articles').get(),
  ])

  const totalUsers = usersSnap.size
  const pendingApprovals = usersSnap.docs.filter((d) => d.data().status === 'pending').length
  const approvedUsers = usersSnap.docs.filter((d) => d.data().status === 'approved').length

  const totalArticles = articlesSnap.size
  const publishedArticles = articlesSnap.docs.filter((d) => d.data().status === 'published').length

  return { totalUsers, pendingApprovals, approvedUsers, totalArticles, publishedArticles }
}

export async function getPendingApprovals(): Promise<PendingApproval[]> {
  const db = getAdminDb()
  const snap = await db.collection('pendingApprovals').orderBy('submittedAt', 'desc').limit(200).get()
  return snap.docs.map((d) => ({
    ...(d.data() as PendingApproval),
    userId: d.id,
  }))
}

export async function approveUser(userId: string, reviewerId: string, notes?: string) {
  const db = getAdminDb()
  const userRef = db.collection('users').doc(userId)
  await userRef.set(
    {
      status: 'approved',
      updatedAt: FieldValue.serverTimestamp(),
      reviewNotes: notes || null,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: reviewerId,
    },
    { merge: true }
  )
  await db.collection('pendingApprovals').doc(userId).delete().catch(() => {})
}

export async function rejectUser(userId: string, reviewerId: string, notes?: string) {
  const db = getAdminDb()
  const userRef = db.collection('users').doc(userId)
  await userRef.set(
    {
      status: 'rejected',
      updatedAt: FieldValue.serverTimestamp(),
      reviewNotes: notes || null,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: reviewerId,
    },
    { merge: true }
  )
  await db.collection('pendingApprovals').doc(userId).delete().catch(() => {})
}

export async function getAllUsers(): Promise<User[]> {
  const db = getAdminDb()
  const snap = await db.collection('users').orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => ({
    ...(d.data() as User),
    id: d.id,
  }))
}

export async function deleteUser(userId: string) {
  const db = getAdminDb()
  await db.collection('users').doc(userId).delete().catch(() => {})
  try {
    await getAdminAuth().deleteUser(userId)
  } catch (err) {
    console.warn('Failed to delete auth user', err)
  }
  await db.collection('pendingApprovals').doc(userId).delete().catch(() => {})
  await db.collection('articles').where('authorId', '==', userId).get().then((snap) => {
    const batch = db.batch()
    snap.docs.forEach((doc) => batch.delete(doc.ref))
    return batch.commit()
  }).catch(() => {})
}
