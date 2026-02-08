import { NextResponse } from 'next/server'
import { getAllUsers, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  try {
    const users = await getAllUsers()
    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error('admin list users error', error)
    return NextResponse.json({ success: false, error: 'Failed to load users' }, { status: 500 })
  }
}

