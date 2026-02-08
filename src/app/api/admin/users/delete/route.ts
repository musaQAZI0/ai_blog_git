import { NextRequest, NextResponse } from 'next/server'
import { deleteUser, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }
    await deleteUser(userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('admin delete user error', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

