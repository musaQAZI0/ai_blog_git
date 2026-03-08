import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'

type PublicFirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

type PublicConfigResponse = {
  firebase: PublicFirebaseConfig
  configured: boolean
}

const isValidFirebaseConfig = (cfg: PublicFirebaseConfig) =>
  Boolean(
    cfg.apiKey &&
      cfg.apiKey.length > 10 &&
      !cfg.apiKey.includes('your_') &&
      cfg.projectId &&
      cfg.projectId.length > 3 &&
      !cfg.projectId.includes('your_')
  )

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

let isFirebaseConfigured = false
let initPromise: Promise<boolean> | null = null

async function fetchPublicFirebaseConfig(): Promise<PublicFirebaseConfig | null> {
  try {
    const res = await fetch('/api/public-config', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as PublicConfigResponse
    return data?.firebase || null
  } catch {
    return null
  }
}

export async function ensureFirebaseInitialized(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (isFirebaseConfigured) return true
  if (initPromise) return initPromise

  initPromise = (async () => {
    const cfg = await fetchPublicFirebaseConfig()
    if (!cfg || !isValidFirebaseConfig(cfg)) {
      isFirebaseConfigured = false
      return false
    }

    try {
      if (!getApps().length) {
        app = initializeApp(cfg)
      } else {
        app = getApps()[0]
      }

      auth = getAuth(app)
      db = getFirestore(app)
      storage = getStorage(app)
      isFirebaseConfigured = true
      return true
    } catch (error) {
      console.warn('Firebase (client) initialization failed:', error)
      isFirebaseConfigured = false
      return false
    }
  })()

  return initPromise
}

export { app, auth, db, storage, isFirebaseConfigured }
