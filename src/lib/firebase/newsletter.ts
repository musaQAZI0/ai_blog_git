import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db, ensureFirebaseInitialized, isFirebaseConfigured } from './config.client'
import { NewsletterSubscription } from '@/types'

const NEWSLETTER_COLLECTION = 'newsletterSubscriptions'

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. Please set up your environment variables.')
  }
  return db
}

async function ensureDbAsync() {
  await ensureFirebaseInitialized()
  return ensureDb()
}

export async function subscribeToNewsletter(
  email: string,
  userId?: string,
  preferences?: NewsletterSubscription['preferences']
): Promise<string> {
  const firestore = await ensureDbAsync()

  // Check if already subscribed
  const existing = await getSubscriptionByEmail(email)
  if (existing && !existing.unsubscribedAt) {
    throw new Error('Email already subscribed')
  }

  const subscriptionData = {
    email,
    userId: userId || null,
    subscribedAt: serverTimestamp(),
    confirmedAt: serverTimestamp(), // Auto-confirm for now, can add double opt-in later
    unsubscribedAt: null,
    preferences: preferences || {
      frequency: 'weekly',
      categories: [],
    },
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(firestore, NEWSLETTER_COLLECTION), subscriptionData)
  return docRef.id
}

export async function unsubscribeFromNewsletter(email: string): Promise<void> {
  const firestore = await ensureDbAsync()

  const q = query(collection(firestore, NEWSLETTER_COLLECTION), where('email', '==', email))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    throw new Error('Subscription not found')
  }

  const subscriptionDoc = snapshot.docs[0]
  await updateDoc(doc(firestore, NEWSLETTER_COLLECTION, subscriptionDoc.id), {
    unsubscribedAt: serverTimestamp(),
  })
}

export async function getSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null> {
  const firestore = await ensureDbAsync()

  const q = query(collection(firestore, NEWSLETTER_COLLECTION), where('email', '==', email))
  const snapshot = await getDocs(q)

  if (snapshot.empty) return null

  const docSnap = snapshot.docs[0]
  return {
    id: docSnap.id,
    ...docSnap.data(),
    subscribedAt: docSnap.data().subscribedAt?.toDate(),
    confirmedAt: docSnap.data().confirmedAt?.toDate(),
    unsubscribedAt: docSnap.data().unsubscribedAt?.toDate(),
  } as NewsletterSubscription
}

export async function getAllActiveSubscribers(
  frequency?: 'daily' | 'weekly' | 'monthly'
): Promise<NewsletterSubscription[]> {
  const firestore = await ensureDbAsync()

  let q = query(
    collection(firestore, NEWSLETTER_COLLECTION),
    where('unsubscribedAt', '==', null),
    where('confirmedAt', '!=', null),
    orderBy('confirmedAt', 'desc')
  )

  if (frequency) {
    q = query(q, where('preferences.frequency', '==', frequency))
  }

  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    subscribedAt: docSnap.data().subscribedAt?.toDate(),
    confirmedAt: docSnap.data().confirmedAt?.toDate(),
    unsubscribedAt: docSnap.data().unsubscribedAt?.toDate(),
  })) as NewsletterSubscription[]
}

export async function updateNewsletterPreferences(
  email: string,
  preferences: NewsletterSubscription['preferences']
): Promise<void> {
  const firestore = await ensureDbAsync()

  const q = query(collection(firestore, NEWSLETTER_COLLECTION), where('email', '==', email))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    throw new Error('Subscription not found')
  }

  const subscriptionDoc = snapshot.docs[0]
  await updateDoc(doc(firestore, NEWSLETTER_COLLECTION, subscriptionDoc.id), {
    preferences,
    updatedAt: serverTimestamp(),
  })
}

export async function getNewsletterStats(): Promise<{
  total: number
  active: number
  unsubscribed: number
  byFrequency: { daily: number; weekly: number; monthly: number }
}> {
  const firestore = await ensureDbAsync()

  const allSnapshot = await getDocs(collection(firestore, NEWSLETTER_COLLECTION))
  const all = allSnapshot.docs.map((d) => d.data())

  const active = all.filter((s) => !s.unsubscribedAt && s.confirmedAt)
  const unsubscribed = all.filter((s) => s.unsubscribedAt)

  const byFrequency = {
    daily: active.filter((s) => s.preferences?.frequency === 'daily').length,
    weekly: active.filter((s) => s.preferences?.frequency === 'weekly').length,
    monthly: active.filter((s) => s.preferences?.frequency === 'monthly').length,
  }

  return {
    total: all.length,
    active: active.length,
    unsubscribed: unsubscribed.length,
    byFrequency,
  }
}
