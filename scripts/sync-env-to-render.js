#!/usr/bin/env node

/**
 * Sync environment variables from .env.local to Render using their API
 *
 * Usage:
 *   node scripts/sync-env-to-render.js
 *
 * Requirements:
 *   - RENDER_API_KEY: Get from https://dashboard.render.com/u/settings/api-keys
 *   - RENDER_SERVICE_ID: Get from your service URL in Render dashboard
 *
 * Set these as environment variables:
 *   export RENDER_API_KEY="your-api-key"
 *   export RENDER_SERVICE_ID="srv-xxxxxxxxxxxx"
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// Configuration
const RENDER_API_KEY = process.env.RENDER_API_KEY
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID
const ENV_FILE = path.join(__dirname, '..', '.env.local')

// Validate configuration
if (!RENDER_API_KEY) {
  console.error('❌ RENDER_API_KEY environment variable is required')
  console.error('   Get your API key from: https://dashboard.render.com/u/settings/api-keys')
  console.error('   Then set it: export RENDER_API_KEY="your-key"')
  process.exit(1)
}

if (!RENDER_SERVICE_ID) {
  console.error('❌ RENDER_SERVICE_ID environment variable is required')
  console.error('   Find it in your Render dashboard URL')
  console.error('   Example: srv-xxxxxxxxxxxx')
  console.error('   Then set it: export RENDER_SERVICE_ID="srv-xxxxxxxxxxxx"')
  process.exit(1)
}

if (!fs.existsSync(ENV_FILE)) {
  console.error(`❌ ${ENV_FILE} not found`)
  process.exit(1)
}

// Parse .env.local file
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const envVars = {}

  content.split('\n').forEach((line) => {
    // Skip comments and empty lines
    line = line.trim()
    if (!line || line.startsWith('#')) return

    // Parse KEY=VALUE
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()

      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      envVars[key] = value
    }
  })

  return envVars
}

// Make API request to Render
function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'))
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${body}`))
        }
      })
    })

    req.on('error', reject)
    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

// Get existing environment variables
async function getExistingEnvVars() {
  try {
    const response = await makeRequest('GET', `/v1/services/${RENDER_SERVICE_ID}/env-vars`)
    return response
  } catch (error) {
    console.error('❌ Failed to fetch existing env vars:', error.message)
    process.exit(1)
  }
}

// Update environment variables
async function updateEnvVars(envVars) {
  const updates = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
  }))

  try {
    await makeRequest('PUT', `/v1/services/${RENDER_SERVICE_ID}/env-vars`, updates)
    return true
  } catch (error) {
    console.error('❌ Failed to update env vars:', error.message)
    return false
  }
}

// Main execution
async function main() {
  console.log('🔍 Reading environment variables from .env.local...\n')
  const localEnvVars = parseEnvFile(ENV_FILE)

  console.log(`Found ${Object.keys(localEnvVars).length} variables:\n`)
  Object.keys(localEnvVars).forEach((key) => {
    const value = localEnvVars[key]
    const preview = key.includes('KEY') || key.includes('SECRET')
      ? value.substring(0, 10) + '...'
      : value.length > 30
      ? value.substring(0, 30) + '...'
      : value
    console.log(`   ${key}: ${preview}`)
  })

  console.log('\n📤 Uploading to Render...')

  const success = await updateEnvVars(localEnvVars)

  if (success) {
    console.log('\n✅ Environment variables synced successfully!')
    console.log('\n⚠️  Important: You need to manually redeploy for changes to take effect')
    console.log('   Go to: https://dashboard.render.com/web/' + RENDER_SERVICE_ID)
    console.log('   Click: Manual Deploy → Clear build cache & deploy')
  } else {
    console.log('\n❌ Failed to sync environment variables')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
