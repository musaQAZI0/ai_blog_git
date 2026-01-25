import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './config'
import { User, UserRegistrationData, UserStatus } from '@/types'

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
  try {
    const firebaseAuth = ensureAuth()
    const firestore = ensureDb()
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password)
    const firebaseUser = userCredential.user

    // Send email verification
    await sendEmailVerification(firebaseUser)

    // Create user document in Firestore
    const userData: Omit<User, 'id'> = {
      email: data.email,
      name: data.name,
      role: 'professional',
      professionalType: data.professionalType,
      otherProfessionalType: data.otherProfessionalType,
      registrationNumber: data.registrationNumber,
      specialization: data.specialization,
      status: 'pending' as UserStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      newsletterSubscribed: data.newsletterConsent,
      gdprConsent: data.gdprConsent,
      gdprConsentDate: new Date(),
    }

    await setDoc(doc(firestore, 'users', firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      gdprConsentDate: serverTimestamp(),
    })

    // Create pending approval document
    await setDoc(doc(firestore, 'pendingApprovals', firebaseUser.uid), {
      userId: firebaseUser.uid,
      userData,
      submittedAt: serverTimestamp(),
    })

    return { user: firebaseUser }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Registration failed'
    return { user: null as unknown as FirebaseUser, error: errorMessage }
  }
}

export async function signIn(email: string, password: string): Promise<{ user: FirebaseUser | null; error?: string }> {
  try {
    const firebaseAuth = ensureAuth()
    const firestore = ensureDb()
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password)

    // Check if user is approved
    const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid))
    if (userDoc.exists()) {
      const userData = userDoc.data() as User
      if (userData.status === 'pending') {
        await firebaseSignOut(firebaseAuth)
        return { user: null, error: 'Twoje konto oczekuje na weryfikację. Skontaktujemy się z Tobą po zatwierdzeniu.' }
      }
      if (userData.status === 'rejected') {
        await firebaseSignOut(firebaseAuth)
        return { user: null, error: 'Twoje konto zostało odrzucone. Skontaktuj się z administratorem.' }
      }
    }

    return { user: userCredential.user }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed'
    return { user: null, error: errorMessage }
  }
}

export async function signOut(): Promise<void> {
  const firebaseAuth = ensureAuth()
  await firebaseSignOut(firebaseAuth)
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const firebaseAuth = ensureAuth()
    await sendPasswordResetEmail(firebaseAuth, email)
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
    return { success: false, error: errorMessage }
  }
}

export async function getCurrentUser(): Promise<User | null> {
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
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}
