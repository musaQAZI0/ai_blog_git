#!/usr/bin/env node

/**
 * Gemini Text Test Script
 *
 * Usage:
 *   node scripts/test-gemini-text.js
 *
 * Env:
 * - GEMINI_API_KEY (required)
 * - GEMINI_TEXT_MODEL (optional)
 * - GEMINI_LIST_MODELS=1 (optional; list models and exit)
 */

const fs = require('fs')
const path = require('path')

// Load .env.local (and .env) without adding dotenv dependency
for (const envFile of ['.env.local', '.env']) {
  const fullPath = path.resolve(process.cwd(), envFile)
  if (!fs.existsSync(fullPath)) continue

  const contents = fs.readFileSync(fullPath, 'utf8')
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) return

    const key = trimmed.slice(0, equalsIndex).trim()
    let value = trimmed.slice(equalsIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) process.env[key] = value
  })
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY is missing in your env (.env.local)')
  process.exit(1)
}

async function listModels() {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': apiKey },
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`ListModels failed (${res.status}): ${text || res.statusText}`)
  }

  const data = JSON.parse(text)
  const models = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name)

  console.log('Models supporting generateContent:')
  for (const m of models) console.log(`- ${m}`)
}

async function testGenerate() {
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-pro-latest'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Return JSON: {"ok": true, "model": "' + model + '"}' }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 128, responseMimeType: 'application/json' },
  }

  console.log(`[gemini] testing model: ${model}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  console.log(`[gemini] status: ${res.status}`)
  console.log(text)
  if (!res.ok) process.exit(2)
}

;(async () => {
  if (process.env.GEMINI_LIST_MODELS === '1') {
    await listModels()
    return
  }
  await testGenerate()
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
