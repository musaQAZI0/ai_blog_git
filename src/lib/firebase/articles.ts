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
import { db, isFirebaseConfigured } from './config'
import { Article, ArticleCreateData, TargetAudience, ArticleStatus } from '@/types'
import { generateSlug } from '@/lib/utils'

const ARTICLES_COLLECTION = 'articles'

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. Please set up your environment variables.')
  }
  return db
}

export async function createArticle(
  data: ArticleCreateData,
  authorId: string,
  authorName: string
): Promise<string> {
  const firestore = ensureDb()
  const slug = generateSlug(data.title)

  const articleData = {
    ...data,
    slug,
    authorId,
    authorName,
    status: 'draft' as ArticleStatus,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(firestore, ARTICLES_COLLECTION), articleData)
  return docRef.id
}

export async function updateArticle(
  articleId: string,
  data: Partial<ArticleCreateData>
): Promise<void> {
  const firestore = ensureDb()
  const articleRef = doc(firestore, ARTICLES_COLLECTION, articleId)

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  }

  if (data.title) {
    updateData.slug = generateSlug(data.title)
  }

  await updateDoc(articleRef, updateData)
}

export async function publishArticle(articleId: string): Promise<void> {
  const firestore = ensureDb()
  const articleRef = doc(firestore, ARTICLES_COLLECTION, articleId)
  await updateDoc(articleRef, {
    status: 'published',
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function unpublishArticle(articleId: string): Promise<void> {
  const firestore = ensureDb()
  const articleRef = doc(firestore, ARTICLES_COLLECTION, articleId)
  await updateDoc(articleRef, {
    status: 'draft',
    updatedAt: serverTimestamp(),
  })
}

export async function deleteArticle(articleId: string): Promise<void> {
  const firestore = ensureDb()
  await deleteDoc(doc(firestore, ARTICLES_COLLECTION, articleId))
}

export async function getArticleById(articleId: string): Promise<Article | null> {
  const firestore = ensureDb()
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
  const firestore = ensureDb()
  const q = query(
    collection(firestore, ARTICLES_COLLECTION),
    where('slug', '==', slug),
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
  const firestore = ensureDb()
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
  const firestore = ensureDb()
  const articleRef = doc(firestore, ARTICLES_COLLECTION, articleId)
  await updateDoc(articleRef, {
    viewCount: increment(1),
  })
}

export async function getArticlesByAuthor(authorId: string): Promise<Article[]> {
  const firestore = ensureDb()
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
  const firestore = ensureDb()
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
