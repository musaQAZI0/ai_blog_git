import 'server-only'

type WindowBucket = {
  resetAt: number
  remaining: number
}

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, WindowBucket> | undefined
}

function getStore(): Map<string, WindowBucket> {
  if (!globalThis.__rateLimitStore) {
    globalThis.__rateLimitStore = new Map()
  }
  return globalThis.__rateLimitStore
}

export function rateLimit(key: string, options: { limit: number; windowMs: number }) {
  const now = Date.now()
  const store = getStore()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    const bucket: WindowBucket = { resetAt: now + options.windowMs, remaining: options.limit - 1 }
    store.set(key, bucket)
    return { ok: true, remaining: bucket.remaining, resetAt: bucket.resetAt }
  }

  if (existing.remaining <= 0) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.remaining -= 1
  store.set(key, existing)
  return { ok: true, remaining: existing.remaining, resetAt: existing.resetAt }
}

