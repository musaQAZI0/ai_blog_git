import 'server-only'
import { marked } from 'marked'

export type PatientWordPressSyncInput = {
  id?: string
  title: string
  slug: string
  content: string
  excerpt: string
}

type WordPressPostStatus = 'publish' | 'draft' | 'pending' | 'private'

type WordPressConfig = {
  siteUrl: string
  apiBase: string
  username: string
  applicationPassword: string
  categorySlug: string
  postStatus: WordPressPostStatus
  timeoutMs: number
}

type WordPressCategory = {
  id: number
  slug: string
}

type WordPressPost = {
  id: number
  link?: string
}

export type WordPressPatientSyncResult = {
  success: boolean
  skipped: boolean
  reason?: string
  action?: 'created' | 'updated'
  postId?: number
  postUrl?: string
  error?: string
}

const DEFAULT_CATEGORY_SLUG = 'strefa-wiedzy'
const DEFAULT_TIMEOUT_MS = 15000

function parsePostStatus(value: string | undefined): WordPressPostStatus {
  if (value === 'draft' || value === 'pending' || value === 'private') {
    return value
  }
  return 'publish'
}

function parseTimeoutMs(value: string | undefined): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1000) return DEFAULT_TIMEOUT_MS
  return Math.floor(parsed)
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

function getWordPressConfig(): { config?: WordPressConfig; reason?: string } {
  if (process.env.WORDPRESS_PATIENT_SYNC_ENABLED !== '1') {
    return { reason: 'WORDPRESS_PATIENT_SYNC_ENABLED is not set to 1' }
  }

  const rawSiteUrl = process.env.WORDPRESS_SITE_URL || process.env.NEXT_PUBLIC_PATIENT_BLOG_URL
  if (!rawSiteUrl) {
    return { reason: 'WORDPRESS_SITE_URL is missing' }
  }

  const username = process.env.WORDPRESS_USERNAME
  const applicationPassword = process.env.WORDPRESS_APPLICATION_PASSWORD
  if (!username || !applicationPassword) {
    return {
      reason: 'WORDPRESS_USERNAME or WORDPRESS_APPLICATION_PASSWORD is missing',
    }
  }

  const siteUrl = normalizeBaseUrl(rawSiteUrl)

  return {
    config: {
      siteUrl,
      apiBase: `${siteUrl}/wp-json/wp/v2`,
      username,
      applicationPassword,
      categorySlug: process.env.WORDPRESS_PATIENT_CATEGORY_SLUG || DEFAULT_CATEGORY_SLUG,
      postStatus: parsePostStatus(process.env.WORDPRESS_PATIENT_POST_STATUS),
      timeoutMs: parseTimeoutMs(process.env.WORDPRESS_PATIENT_SYNC_TIMEOUT_MS),
    },
  }
}

function basicAuthHeader(config: WordPressConfig): string {
  const token = Buffer.from(`${config.username}:${config.applicationPassword}`).toString('base64')
  return `Basic ${token}`
}

async function wpRequest<T>(config: WordPressConfig, endpoint: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(endpoint, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: basicAuthHeader(config),
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`WordPress API ${response.status}: ${body.slice(0, 300)}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

async function resolveCategoryId(config: WordPressConfig): Promise<number> {
  const categoryEndpoint = `${config.apiBase}/categories?slug=${encodeURIComponent(
    config.categorySlug
  )}&per_page=1&_fields=id,slug`

  const categories = await wpRequest<WordPressCategory[]>(config, categoryEndpoint)
  if (!categories.length) {
    throw new Error(`WordPress category slug "${config.categorySlug}" was not found`)
  }
  return categories[0].id
}

async function findExistingPostBySlug(
  config: WordPressConfig,
  slug: string
): Promise<WordPressPost | null> {
  const postEndpoint = `${config.apiBase}/posts?slug=${encodeURIComponent(
    slug
  )}&per_page=1&context=edit&_fields=id,link`
  const posts = await wpRequest<WordPressPost[]>(config, postEndpoint)
  return posts.length ? posts[0] : null
}

export async function syncPatientArticleToWordPress(
  article: PatientWordPressSyncInput
): Promise<WordPressPatientSyncResult> {
  const { config, reason } = getWordPressConfig()
  if (!config) {
    return {
      success: false,
      skipped: true,
      reason,
    }
  }

  try {
    const categoryId = await resolveCategoryId(config)
    const existingPost = await findExistingPostBySlug(config, article.slug)

    const payload = {
      title: article.title.trim(),
      slug: article.slug.trim(),
      content: await marked.parse(article.content.trim()),
      excerpt: article.excerpt.trim(),
      status: config.postStatus,
      categories: [categoryId],
    }

    const endpoint = existingPost
      ? `${config.apiBase}/posts/${existingPost.id}`
      : `${config.apiBase}/posts`

    const post = await wpRequest<WordPressPost>(config, endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return {
      success: true,
      skipped: false,
      action: existingPost ? 'updated' : 'created',
      postId: post.id,
      postUrl: post.link,
    }
  } catch (error) {
    return {
      success: false,
      skipped: false,
      error: error instanceof Error ? error.message : 'WordPress sync failed',
    }
  }
}

