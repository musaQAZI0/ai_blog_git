/**
 * Firebase Storage Integration
 * Uses Firebase Cloud Storage for file uploads
 */

import { storage, isFirebaseConfigured } from '@/lib/firebase/config.server'
import { ref, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage'

/**
 * Upload file to Firebase Storage
 */
export async function uploadToFirebase(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'uploads'
): Promise<string> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage is not configured')
  }

  try {
    // Create storage reference with folder structure
    const storageRef = ref(storage, `${folder}/${fileName}`)

    // Convert Buffer to Blob for Firebase upload
    // Convert Buffer to Uint8Array for Blob compatibility
    const blob = new Blob([new Uint8Array(file)], { type: contentType })

    // Upload file with metadata
    const metadata = {
      contentType,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    }

    const snapshot = await uploadBytes(storageRef, blob, metadata)

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref)

    return downloadURL
  } catch (error) {
    console.error('Firebase Storage upload error:', error)
    throw new Error('Failed to upload file to Firebase Storage')
  }
}

/**
 * Delete file from Firebase Storage
 */
export async function deleteFromFirebase(
  fileName: string,
  folder: string = 'uploads'
): Promise<void> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage is not configured')
  }

  try {
    const storageRef = ref(storage, `${folder}/${fileName}`)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Firebase Storage delete error:', error)
    throw new Error('Failed to delete file from Firebase Storage')
  }
}

/**
 * Get download URL for a file in Firebase Storage
 */
export async function getFirebaseDownloadURL(
  fileName: string,
  folder: string = 'uploads'
): Promise<string> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage is not configured')
  }

  try {
    const storageRef = ref(storage, `${folder}/${fileName}`)
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  } catch (error) {
    console.error('Firebase Storage URL error:', error)
    throw new Error('Failed to get download URL from Firebase Storage')
  }
}

/**
 * Upload image to Firebase Storage with specific folder structure
 */
export async function uploadImageToFirebase(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  return uploadToFirebase(file, fileName, contentType, 'images')
}

/**
 * Upload PDF to Firebase Storage
 */
export async function uploadPDFToFirebase(
  file: Buffer,
  fileName: string
): Promise<string> {
  return uploadToFirebase(file, fileName, 'application/pdf', 'pdfs')
}

/**
 * Upload avatar to Firebase Storage
 */
export async function uploadAvatarToFirebase(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  return uploadToFirebase(file, fileName, contentType, 'avatars')
}
