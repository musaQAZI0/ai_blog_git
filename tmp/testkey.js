const fs = require('fs')

const line = fs
  .readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('FIREBASE_ADMIN_PRIVATE_KEY='))

const value = line.split('=')[1]
const pk = value.replace(/\\\\/g, '\\').replace(/\\n/g, '\n')

console.log('raw value sample', JSON.stringify(value.slice(0, 40)))
console.log('pk sample', JSON.stringify(pk.slice(0, 40)))
console.log('backslashes raw', (value.match(/\\/g) || []).length)
console.log('backslashes pk', (pk.match(/\\/g) || []).length)

const { initializeApp, cert, getApps } = require('firebase-admin/app')
try {
  initializeApp({
    credential: cert({
      projectId: 'medical-blog-web',
      clientEmail: 'firebase-adminsdk-fbsvc@medical-blog-web.iam.gserviceaccount.com',
      privateKey: pk,
    }),
  })
  console.log('init success', getApps().length)
} catch (e) {
  console.error('init fail', e.message)
}
