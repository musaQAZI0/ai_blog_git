import 'server-only'

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.apiKey.length > 10 &&
    !firebaseConfig.apiKey.includes('your_') &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId.length > 3 &&
    !firebaseConfig.projectId.includes('your_')
)

<<<<<<< HEAD:src/lib/firebase/config.server.ts
=======
if (typeof window !== 'undefined') {
  if (isFirebaseConfigured) {
    console.log('[firebase] configured: true')
  } else {
    console.warn('[firebase] configured: false (missing NEXT_PUBLIC_FIREBASE_* env vars at build time)', {
      hasApiKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      hasAuthDomain: Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      hasProjectId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      hasStorageBucket: Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
      hasMessagingSenderId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
      hasAppId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    })
  }
}

>>>>>>> ff7bc50839a3347dbc2d5e87e9b58e829c2e8a2c:src/lib/firebase/config.ts
let app: FirebaseApp | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

if (isFirebaseConfigured) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }
    db = getFirestore(app)
    storage = getStorage(app)
  } catch (error) {
    console.warn('Firebase (server) initialization failed:', error)
  }
}

export { app, db, storage }
