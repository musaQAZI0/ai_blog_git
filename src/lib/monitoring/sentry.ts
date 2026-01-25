/**
 * Sentry Error Tracking Integration
 * Install: npm install @sentry/nextjs
 */

/*
To set up Sentry:

1. Install the package:
   npm install @sentry/nextjs

2. Run the Sentry wizard:
   npx @sentry/wizard@latest -i nextjs

3. This will create:
   - sentry.client.config.ts
   - sentry.server.config.ts
   - sentry.edge.config.ts
   - next.config.js (updated)

4. Add to .env.local:
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
   SENTRY_AUTH_TOKEN=your_auth_token
   SENTRY_ORG=your_organization
   SENTRY_PROJECT=your_project
*/

export function initializeSentry() {
  console.log('Sentry initialization - Install @sentry/nextjs package')
}

/**
 * Capture exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  console.error('Error:', error, context)

  /*
  import * as Sentry from '@sentry/nextjs'

  Sentry.captureException(error, {
    extra: context,
  })
  */
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`[${level}]`, message)

  /*
  import * as Sentry from '@sentry/nextjs'

  Sentry.captureMessage(message, level)
  */
}

/**
 * Set user context
 */
export function setUserContext(user: { id: string; email?: string; name?: string }) {
  console.log('User context:', user)

  /*
  import * as Sentry from '@sentry/nextjs'

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  })
  */
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  console.log(`[Breadcrumb - ${category}]`, message)

  /*
  import * as Sentry from '@sentry/nextjs'

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  })
  */
}
