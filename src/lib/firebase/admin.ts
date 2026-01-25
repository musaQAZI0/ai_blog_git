import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './config'
import { User, PendingApproval, UserStatus } from '@/types'

const USERS_COLLECTION = 'users'
const PENDING_APPROVALS_COLLECTION = 'pendingApprovals'

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. Please set up your environment variables.')
  }
  return db
}

export async function getPendingApprovals(): Promise<PendingApproval[]> {
  const firestore = ensureDb()
  const q = query(
    collection(firestore, PENDING_APPROVALS_COLLECTION),
    orderBy('submittedAt', 'desc')
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    userId: doc.id,
    ...doc.data(),
    submittedAt: doc.data().submittedAt?.toDate(),
    reviewedAt: doc.data().reviewedAt?.toDate(),
  })) as PendingApproval[]
}

export async function approveUser(
  userId: string,
  reviewerId: string,
  notes?: string
): Promise<void> {
  const firestore = ensureDb()
  // Update user status
  const userRef = doc(firestore, USERS_COLLECTION, userId)
  await updateDoc(userRef, {
    status: 'approved' as UserStatus,
    updatedAt: serverTimestamp(),
  })

  // Update pending approval record
  const approvalRef = doc(firestore, PENDING_APPROVALS_COLLECTION, userId)
  await updateDoc(approvalRef, {
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    reviewNotes: notes || '',
  })

  // Optionally, delete the pending approval after some time
  // For audit purposes, we keep it
}

export async function rejectUser(
  userId: string,
  reviewerId: string,
  notes?: string
): Promise<void> {
  const firestore = ensureDb()
  // Update user status
  const userRef = doc(firestore, USERS_COLLECTION, userId)
  await updateDoc(userRef, {
    status: 'rejected' as UserStatus,
    updatedAt: serverTimestamp(),
  })

  // Update pending approval record
  const approvalRef = doc(firestore, PENDING_APPROVALS_COLLECTION, userId)
  await updateDoc(approvalRef, {
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    reviewNotes: notes || '',
  })
}

export async function getAllUsers(status?: UserStatus): Promise<User[]> {
  const firestore = ensureDb()
  let q = query(collection(firestore, USERS_COLLECTION), orderBy('createdAt', 'desc'))

  if (status) {
    q = query(q, where('status', '==', status))
  }

  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    updatedAt: docSnap.data().updatedAt?.toDate(),
    gdprConsentDate: docSnap.data().gdprConsentDate?.toDate(),
  })) as User[]
}

export async function getUserById(userId: string): Promise<User | null> {
  const firestore = ensureDb()
  const userDoc = await getDoc(doc(firestore, USERS_COLLECTION, userId))
  if (!userDoc.exists()) return null

  return {
    id: userDoc.id,
    ...userDoc.data(),
    createdAt: userDoc.data().createdAt?.toDate(),
    updatedAt: userDoc.data().updatedAt?.toDate(),
    gdprConsentDate: userDoc.data().gdprConsentDate?.toDate(),
  } as User
}

export async function updateUserRole(
  userId: string,
  role: User['role']
): Promise<void> {
  const firestore = ensureDb()
  const userRef = doc(firestore, USERS_COLLECTION, userId)
  await updateDoc(userRef, {
    role,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteUser(userId: string): Promise<void> {
  const firestore = ensureDb()
  // Delete user document
  await deleteDoc(doc(firestore, USERS_COLLECTION, userId))

  // Delete pending approval if exists
  try {
    await deleteDoc(doc(firestore, PENDING_APPROVALS_COLLECTION, userId))
  } catch {
    // Ignore if doesn't exist
  }
}

export async function getAdminStats(): Promise<{
  totalUsers: number
  pendingApprovals: number
  approvedUsers: number
  totalArticles: number
  publishedArticles: number
}> {
  const firestore = ensureDb()
  const [usersSnapshot, pendingSnapshot, articlesSnapshot] = await Promise.all([
    getDocs(collection(firestore, USERS_COLLECTION)),
    getDocs(query(collection(firestore, PENDING_APPROVALS_COLLECTION))),
    getDocs(collection(firestore, 'articles')),
  ])

  const users = usersSnapshot.docs.map((d) => d.data())
  const articles = articlesSnapshot.docs.map((d) => d.data())

  return {
    totalUsers: users.length,
    pendingApprovals: pendingSnapshot.size,
    approvedUsers: users.filter((u) => u.status === 'approved').length,
    totalArticles: articles.length,
    publishedArticles: articles.filter((a) => a.status === 'published').length,
  }
}
