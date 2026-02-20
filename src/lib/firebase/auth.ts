import {
  createUserWithEmailAndPassword,
  deleteUser as firebaseDeleteUser,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth'
import { deleteDoc, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, ensureFirebaseInitialized, isFirebaseConfigured } from './config.client'
import { User, UserRegistrationData, UserStatus } from '@/types'
import { subscribeToNewsletter } from './newsletter'

function removeUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined)
  return Object.fromEntries(entries) as Partial<T>
}

function ensureAuth() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase Auth is not configured.')
  }
  return auth
}

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase Firestore is not configured.')
  }
  return db
}

export async function registerUser(data: UserRegistrationData): Promise<{ user: FirebaseUser; error?: string }> {
  let firebaseUser: FirebaseUser | null = null
  try {
    await ensureFirebaseInitialized()
    const firebaseAuth = ensureAuth()
    const firestore = ensureDb()
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password)
    firebaseUser = userCredential.user

    // Send email verification
    await sendEmailVerification(firebaseUser)

    // Create user document in Firestore
    const userData = removeUndefined<Omit<User, 'id'>>({
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber,
      role: 'professional',
      professionalType: data.professionalType,
      otherProfessionalType: data.otherProfessionalType,
      registrationNumber: data.registrationNumber,
      specialization: data.specialization,
      status: 'approved' as UserStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      newsletterSubscribed: true,
      gdprConsent: data.gdprConsent,
      gdprConsentDate: new Date(),
    })

    await setDoc(doc(firestore, 'users', firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      gdprConsentDate: serverTimestamp(),
    })

    try {
      await subscribeToNewsletter(data.email, firebaseUser.uid)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error || '')
      if (!message.toLowerCase().includes('already subscribed')) {
        throw new Error('Nie udalo sie zapisac do newslettera')
      }
    }

    return { user: firebaseUser }
  } catch (error: unknown) {
    if (firebaseUser) {
      const firestore = db
      if (firestore) {
        await deleteDoc(doc(firestore, 'users', firebaseUser.uid)).catch(() => {})
      }
      await firebaseDeleteUser(firebaseUser).catch(() => {})
    }

    const errorMessage = error instanceof Error ? error.message : 'Registration failed'
    return { user: null as unknown as FirebaseUser, error: errorMessage }
  }
}

export async function signIn(email: string, password: string): Promise<{ user: FirebaseUser | null; error?: string }> {
  try {
    console.log('[auth] signIn start', { email })
    await ensureFirebaseInitialized()
    const firebaseAuth = ensureAuth()
    const firestore = ensureDb()
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password)
    console.log('[auth] firebase signIn ok', { uid: userCredential.user.uid })

    // Check if user is approved
    const userRef = doc(firestore, 'users', userCredential.user.uid)
    let userDoc = await getDoc(userRef)

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL)?.toLowerCase()
    const isAdminEmail = Boolean(adminEmail && adminEmail === email.toLowerCase())

    if (!userDoc.exists()) {
      const defaultName = email.split('@')[0] || email

      const newUserData = {
        email,
        name: defaultName,
        role: isAdminEmail ? 'admin' : 'professional',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
        newsletterSubscribed: false,
        gdprConsent: false,
        gdprConsentDate: new Date(),
      }

      await setDoc(userRef, {
        ...newUserData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        gdprConsentDate: serverTimestamp(),
      })



      console.log('[auth] user doc auto-created', {
        role: newUserData.role,
        status: newUserData.status,
      })
      userDoc = await getDoc(userRef)
    }

    if (userDoc.exists()) {
      const userData = userDoc.data() as User

      // Backfill: if this is the designated admin email, ensure admin+approved
      if (isAdminEmail && (userData.role !== 'admin' || userData.status !== 'approved')) {
        await setDoc(userRef, {
          ...userData,
          role: 'admin',
          status: 'approved',
          updatedAt: serverTimestamp(),
        }, { merge: true })
        console.log('[auth] upgraded user to admin+approved based on NEXT_PUBLIC_ADMIN_EMAIL')
        userDoc = await getDoc(userRef)
      }

      console.log('[auth] user doc found', { status: userData.status, role: userData.role })
      if (userData.status === 'rejected') {
        await firebaseSignOut(firebaseAuth)
        return { user: null, error: 'Twoje konto zostało odrzucone. Skontaktuj się z administratorem.' }
      }
    }


    return { user: userCredential.user }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed'
    console.log('[auth] signIn error', errorMessage)
    return { user: null, error: errorMessage }
  }
}

export async function signOut(): Promise<void> {
  await ensureFirebaseInitialized()
  const firebaseAuth = ensureAuth()
  await firebaseSignOut(firebaseAuth)
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureFirebaseInitialized()
    const firebaseAuth = ensureAuth()
    await sendPasswordResetEmail(firebaseAuth, email)
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
    return { success: false, error: errorMessage }
  }
}

export async function getCurrentUser(): Promise<User | null> {
  await ensureFirebaseInitialized()
  if (!isFirebaseConfigured || !auth || !db) return null

  const firebaseUser = auth.currentUser
  if (!firebaseUser) return null

  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
  if (!userDoc.exists()) return null

  return { id: userDoc.id, ...userDoc.data() } as User
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  if (!isFirebaseConfigured || !auth) {
    // Return no-op unsubscribe function in demo mode
    return () => { }
  }
  return onAuthStateChanged(auth, callback)
}
