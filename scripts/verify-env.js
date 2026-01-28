#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * Validates that all required environment variables are set before build
 * Loads local .env files so "node scripts/verify-env.js" matches Next.js env behavior.
 */

const fs = require('fs')
const path = require('path')

const envFiles = [
  '.env.local',
  '.env',
  path.join('src', '.env'),
]

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return

  const contents = fs.readFileSync(filePath, 'utf8')
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const exportPrefix = 'export '
    const normalized = trimmed.startsWith(exportPrefix)
      ? trimmed.slice(exportPrefix.length)
      : trimmed

    const equalsIndex = normalized.indexOf('=')
    if (equalsIndex === -1) return

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
  })
}

envFiles.forEach((file) => loadEnvFile(path.resolve(process.cwd(), file)))

const requiredEnvVars = {
  firebase: [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ],
  firebaseAdmin: [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
  ],
  app: [
    'NEXT_PUBLIC_APP_URL',
    'ADMIN_EMAIL',
  ],
}

const optionalEnvVars = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SENDGRID_API_KEY',
  'EXPORT_API_SECRET',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
]

let hasErrors = false
const missingVars = []
const invalidVars = []
const warnings = []

console.log('🔍 Verifying environment variables...\n')

// Check required Firebase variables
console.log('📱 Firebase Configuration:')
requiredEnvVars.firebase.forEach((varName) => {
  const value = process.env[varName]

  if (!value || value.trim() === '') {
    console.log(`   ❌ ${varName}: Missing`)
    missingVars.push(varName)
    hasErrors = true
  } else if (value.includes('your_') || value.includes('your-')) {
    console.log(`   ⚠️  ${varName}: Contains placeholder value`)
    invalidVars.push(varName)
    hasErrors = true
  } else if (varName.includes('API_KEY') && value.length < 20) {
    console.log(`   ⚠️  ${varName}: Value seems too short`)
    invalidVars.push(varName)
    hasErrors = true
  } else {
    console.log(`   ✅ ${varName}: Set (${value.substring(0, 10)}...)`)
  }
})

// Check Firebase Admin variables
console.log('\n🔐 Firebase Admin Configuration:')
requiredEnvVars.firebaseAdmin.forEach((varName) => {
  const value = process.env[varName]

  if (!value || value.trim() === '') {
    console.log(`   ❌ ${varName}: Missing`)
    missingVars.push(varName)
    hasErrors = true
  } else if (value.includes('your_') || value.includes('your-')) {
    console.log(`   ⚠️  ${varName}: Contains placeholder value`)
    invalidVars.push(varName)
    hasErrors = true
  } else {
    const preview = varName.includes('PRIVATE_KEY')
      ? value.substring(0, 30) + '...'
      : value.substring(0, 20) + '...'
    console.log(`   ✅ ${varName}: Set (${preview})`)
  }
})

// Check app configuration
console.log('\n⚙️  App Configuration:')
requiredEnvVars.app.forEach((varName) => {
  const value = process.env[varName]

  if (!value || value.trim() === '') {
    console.log(`   ❌ ${varName}: Missing`)
    missingVars.push(varName)
    hasErrors = true
  } else {
    console.log(`   ✅ ${varName}: ${value}`)
  }
})

// Check optional variables
console.log('\n🔧 Optional Configuration:')
optionalEnvVars.forEach((varName) => {
  const value = process.env[varName]

  if (!value || value.trim() === '') {
    console.log(`   ⚠️  ${varName}: Not set (optional)`)
    warnings.push(varName)
  } else {
    console.log(`   ✅ ${varName}: Set`)
  }
})

// Summary
console.log('\n' + '='.repeat(60))
if (hasErrors) {
  console.log('❌ VERIFICATION FAILED\n')

  if (missingVars.length > 0) {
    console.log('Missing required variables:')
    missingVars.forEach((varName) => {
      console.log(`   - ${varName}`)
    })
    console.log('')
  }

  if (invalidVars.length > 0) {
    console.log('Invalid or placeholder values detected:')
    invalidVars.forEach((varName) => {
      console.log(`   - ${varName}`)
    })
    console.log('')
  }

  console.log('Please set these environment variables before building.')
  console.log('\nFor local development:')
  console.log('   1. Copy .env.example to .env.local')
  console.log('   2. Fill in your actual values')
  console.log('\nFor production (Render):')
  console.log('   1. Go to https://dashboard.render.com')
  console.log('   2. Select your service')
  console.log('   3. Go to Environment tab')
  console.log('   4. Add each missing variable')
  console.log('')

  process.exit(1)
} else {
  console.log('✅ ALL REQUIRED VARIABLES ARE SET\n')

  if (warnings.length > 0) {
    console.log(`⚠️  Note: ${warnings.length} optional variable(s) not set`)
    console.log('   Some features may be limited.')
  }

  console.log('\n✨ Ready to build!\n')
  process.exit(0)
}
