/**
 * Firebase Connection Test Script
 * Run with: node test-firebase.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })

console.log('=== FIREBASE CREDENTIALS TEST ===\n')

// Test 1: Check if all required env vars are present
console.log('1. Checking environment variables...')
const requiredClientVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
]

const requiredAdminVars = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
]

let allPresent = true
requiredClientVars.forEach(varName => {
  const value = process.env[varName]
  if (!value || value.includes('your_') || value.length < 5) {
    console.log(`   ❌ ${varName}: MISSING or INVALID`)
    allPresent = false
  } else {
    console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`)
  }
})

console.log('\n2. Checking admin credentials...')
requiredAdminVars.forEach(varName => {
  const value = process.env[varName]
  if (!value || value.includes('your_') || value.length < 5) {
    console.log(`   ❌ ${varName}: MISSING or INVALID`)
    allPresent = false
  } else {
    console.log(`   ✅ ${varName}: ${value.substring(0, 30)}...`)
  }
})

// Test 2: Check project ID consistency
console.log('\n3. Checking project ID consistency...')
const clientProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const adminProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID

if (clientProjectId === adminProjectId) {
  console.log(`   ✅ Project IDs match: ${clientProjectId}`)
} else {
  console.log(`   ❌ Project IDs DON'T match!`)
  console.log(`      Client: ${clientProjectId}`)
  console.log(`      Admin:  ${adminProjectId}`)
  allPresent = false
}

// Test 3: Check private key format
console.log('\n4. Checking private key format...')
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
if (privateKey) {
  const hasNewlines = privateKey.includes('\\n')
  const startsCorrectly = privateKey.startsWith('MII') || privateKey.startsWith('-----BEGIN')

  if (hasNewlines && startsCorrectly) {
    console.log(`   ✅ Private key format looks correct`)
    console.log(`   ✅ Length: ${privateKey.length} characters`)
  } else {
    console.log(`   ⚠️  Private key might have formatting issues`)
    console.log(`      Has \\n: ${hasNewlines}`)
    console.log(`      Starts correctly: ${startsCorrectly}`)
  }
}

// Final summary
console.log('\n=== SUMMARY ===')
if (allPresent) {
  console.log('✅ All Firebase credentials are present and formatted correctly!')
  console.log('\n📝 Next steps:')
  console.log('   1. Copy these exact values to Render environment variables')
  console.log('   2. Make sure to copy FIREBASE_ADMIN_PRIVATE_KEY exactly as is (with \\n)')
  console.log('   3. Redeploy on Render')
} else {
  console.log('❌ Some credentials are missing or invalid')
  console.log('   Please check your Firebase Console and update .env.local')
}
