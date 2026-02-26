#!/usr/bin/env node

/**
 * Minimal SendGrid delivery test using the project's current REST-based integration style.
 * Sends a single email to confirm API key + verified sender work before clicking SendGrid's
 * "Next: Verify Integration" step.
 */

const fs = require('fs')
const path = require('path')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const normalized = line.startsWith('export ') ? line.slice(7) : line
    const equalsIndex = normalized.indexOf('=')
    if (equalsIndex <= 0) continue

    const key = normalized.slice(0, equalsIndex).trim()
    let value = normalized.slice(equalsIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function loadEnv() {
  const cwd = process.cwd()
  loadEnvFile(path.join(cwd, '.env.local'))
  loadEnvFile(path.join(cwd, '.env'))
}

async function main() {
  loadEnv()

  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL
  const toEmail = process.argv[2] || process.env.SENDGRID_TEST_TO_EMAIL

  if (!apiKey || !apiKey.startsWith('SG.')) {
    console.error('Missing or invalid SENDGRID_API_KEY in .env.local')
    process.exit(1)
  }

  if (!fromEmail) {
    console.error('Missing SENDGRID_FROM_EMAIL in .env.local')
    process.exit(1)
  }

  if (!toEmail) {
    console.error('Provide recipient email as an argument or set SENDGRID_TEST_TO_EMAIL')
    console.error('Example: npm run test:sendgrid -- you@example.com')
    process.exit(1)
  }

  const message = {
    personalizations: [
      {
        to: [{ email: toEmail }],
        subject: 'SendGrid integration test (ai blog)',
      },
    ],
    from: {
      email: fromEmail,
      name: 'AI Blog',
    },
    content: [
      {
        type: 'text/plain',
        value: `SendGrid test email sent at ${new Date().toISOString()}`,
      },
      {
        type: 'text/html',
        value: `<p>SendGrid test email sent at <strong>${new Date().toISOString()}</strong></p>`,
      },
    ],
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`SendGrid request failed (${response.status})`)
    console.error(body)
    process.exit(1)
  }

  console.log(`Email accepted by SendGrid (status ${response.status})`)
  console.log(`From: ${fromEmail}`)
  console.log(`To:   ${toEmail}`)
}

main().catch((error) => {
  console.error('Unexpected error while sending test email:')
  console.error(error)
  process.exit(1)
})
