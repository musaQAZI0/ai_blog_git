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
  limit,
  startAfter,
  serverTimestamp,
  increment,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db, ensureFirebaseInitialized, isFirebaseConfigured } from './config.client'
import { Article, ArticleCreateData, TargetAudience, ArticleStatus } from '@/types'
import { generateSlug } from '@/lib/utils'

const ARTICLES_COLLECTION = 'articles'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function removeUndefinedDeep<T>(value: T): T | undefined {
  if (value === undefined) return undefined

  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => removeUndefinedDeep(item))
      .filter((item) => item !== undefined) as unknown as T
    return cleaned
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value as Record<string, unknown>)
    const cleaned: Record<string, unknown> = {}
    for (const [key, val] of entries) {
      const next = removeUndefinedDeep(val)
      if (next !== undefined) {
        cleaned[key] = next
      }
    }
    return cleaned as T
  }

  // Treat non-plain objects (e.g., Firestore FieldValue) as leaf values.
  return value
}

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

export async function createArticle(
  data: ArticleCreateData,
  authorId: string,
  authorName: string
): Promise<string> {
  const firestore = await ensureDbAsync()
  const slug = generateSlug(data.title)

  const articleData = removeUndefinedDeep({
    ...data,
    slug,
    authorId,
    authorName,
    status: 'draft' as ArticleStatus,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const docRef = await addDoc(
    collection(firestore, ARTICLES_COLLECTION),
    (articleData || {}) as Record<string, unknown>
  )
  return docRef.id
}

export async function updateArticle(
  articleId: string,
  data: Partial<ArticleCreateData>
): Promise<void> {
  const firestore = await ensureDbAsync()
  const articleRef = doc(firestore, ARTICLES_COLLECTION, articleId)

  const updateData: Record<string, unknown> = (removeUndefinedDeep({
    ...data,
    updatedAt: serverTimestamp(),
  }) as Record<string, unknown> | undefined) || {}

  if (data.title) {
    updateData.slug = generateSlug(data.title)
  }

  await updateDoc(articleRef, updateData)
}

export async function publishArticle(articleId: string): Promise<void> {
  const firestore = await ensureDbAsync()
  const articleRef = doc(firestore, ARTICLES_COLLECTION, articleId)
  await updateDoc(articleRef, {
    status: 'published',
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function unpublishArticle(articleId: string): Promise<void> {
  const firestore = await ensureDbAsync()
  const articleRef = doc(firestore, ARTICLES_COLLECTION, articleId)
  await updateDoc(articleRef, {
    status: 'draft',
    updatedAt: serverTimestamp(),
  })
}

export async function deleteArticle(articleId: string): Promise<void> {
  const firestore = await ensureDbAsync()
  await deleteDoc(doc(firestore, ARTICLES_COLLECTION, articleId))
}

export async function getArticleById(articleId: string): Promise<Article | null> {
  const firestore = await ensureDbAsync()
  const articleDoc = await getDoc(doc(firestore, ARTICLES_COLLECTION, articleId))
  if (!articleDoc.exists()) return null

  return {
    id: articleDoc.id,
    ...articleDoc.data(),
    createdAt: articleDoc.data().createdAt?.toDate(),
    updatedAt: articleDoc.data().updatedAt?.toDate(),
    publishedAt: articleDoc.data().publishedAt?.toDate(),
  } as Article
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
<<<<<<< HEAD
  const firestore = await ensureDbAsync()
=======
  const firestore = ensureDb()
>>>>>>> ff7bc50839a3347dbc2d5e87e9b58e829c2e8a2c
  // Public slug pages should only resolve published articles.
  // (Drafts are accessible by ID for the author/admin in the dashboard.)
  const q = query(
    collection(firestore, ARTICLES_COLLECTION),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1)
  )

  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const docSnap = snapshot.docs[0]
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    updatedAt: docSnap.data().updatedAt?.toDate(),
    publishedAt: docSnap.data().publishedAt?.toDate(),
  } as Article
}

export async function getArticles(options: {
  targetAudience?: TargetAudience
  status?: ArticleStatus
  category?: string
  pageSize?: number
  lastDoc?: DocumentSnapshot
}): Promise<{ articles: Article[]; lastDoc: DocumentSnapshot | null }> {
  const firestore = await ensureDbAsync()
  const {
    targetAudience,
    status = 'published',
    category,
    pageSize = 12,
    lastDoc,
  } = options

  let q = query(
    collection(firestore, ARTICLES_COLLECTION),
    where('status', '==', status),
    orderBy('publishedAt', 'desc'),
    limit(pageSize)
  )

  if (targetAudience) {
    q = query(q, where('targetAudience', '==', targetAudience))
  }

  if (category) {
    q = query(q, where('category', '==', category))
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }

  const snapshot = await getDocs(q)

  const articles = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
    publishedAt: doc.data().publishedAt?.toDate(),
  })) as Article[]

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null

  return { articles, lastDoc: newLastDoc }
}

export async function incrementViewCount(articleId: string): Promise<void> {
  const firestore = await ensureDbAsync()
  const articleRef = doc(firestore, ARTICLES_COLLECTION, articleId)
  await updateDoc(articleRef, {
    viewCount: increment(1),
  })
}

export async function getArticlesByAuthor(authorId: string): Promise<Article[]> {
  const firestore = await ensureDbAsync()
  const q = query(
    collection(firestore, ARTICLES_COLLECTION),
    where('authorId', '==', authorId),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    updatedAt: docSnap.data().updatedAt?.toDate(),
    publishedAt: docSnap.data().publishedAt?.toDate(),
  })) as Article[]
}

export async function searchArticles(
  searchTerm: string,
  targetAudience?: TargetAudience
): Promise<Article[]> {
  const firestore = await ensureDbAsync()
  // Note: For production, consider using Algolia or similar for full-text search
  // This is a basic implementation that searches by title
  let q = query(
    collection(firestore, ARTICLES_COLLECTION),
    where('status', '==', 'published'),
    orderBy('title'),
    limit(20)
  )

  if (targetAudience) {
    q = query(q, where('targetAudience', '==', targetAudience))
  }

  const snapshot = await getDocs(q)

  const allArticles = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    updatedAt: docSnap.data().updatedAt?.toDate(),
    publishedAt: docSnap.data().publishedAt?.toDate(),
  })) as Article[]

  const articles = allArticles.filter((article) =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return articles
}
