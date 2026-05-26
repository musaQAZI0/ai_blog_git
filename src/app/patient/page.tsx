import { getMockArticles } from '@/lib/mock-data'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'
import { Article } from '@/types'
import { PatientBlogClient } from './PatientBlogClient'

export const revalidate = 300

function hasClientFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''
  return Boolean(
    apiKey &&
      apiKey.length > 10 &&
      !apiKey.includes('your_') &&
      projectId &&
      projectId.length > 3 &&
      !projectId.includes('your_')
  )
}

function serializeDate(value: unknown) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    const maybe = value as { toDate?: () => Date }
    if (typeof maybe.toDate === 'function') return maybe.toDate().toISOString()
  }
  return value
}

async function getInitialPatientArticles(): Promise<Article[]> {
  if (!isFirebaseAdminConfigured()) return getMockArticles('patient')

  try {
    const snapshot = await getAdminDb()
      .collection('articles')
      .where('status', '==', 'published')
      .where('targetAudience', '==', 'patient')
      .orderBy('publishedAt', 'desc')
      .limit(12)
      .get()

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>
      return {
        id: docSnap.id,
        ...data,
        createdAt: serializeDate(data.createdAt),
        updatedAt: serializeDate(data.updatedAt),
        publishedAt: serializeDate(data.publishedAt),
      } as Article
    })
  } catch (error) {
    console.error('Error fetching initial patient articles:', error)
    return getMockArticles('patient')
  }
}

export default async function PatientBlogPage() {
  const firebaseConfigured = hasClientFirebaseConfig()
  const initialArticles = await getInitialPatientArticles()

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/65">
          Blog dla Pacjentow
        </p>
        <h1 className="mt-4 text-[clamp(1.9rem,5vw,3.1rem)] font-semibold leading-[1.02] tracking-tight text-black">
          Zdrowie oczu
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/70 sm:text-[15px]">
          Przystepne artykuly o zdrowiu oczu, chorobach i profilaktyce okulistycznej.
        </p>
      </div>

      <PatientBlogClient
        initialArticles={initialArticles}
        hasFirebaseConfig={firebaseConfigured}
      />
    </div>
  )
}
