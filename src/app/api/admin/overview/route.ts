import { NextResponse } from 'next/server'
import {
  getAdminStats,
  getPendingApprovals,
  isFirebaseAdminConfigured,
} from '@/lib/firebase/admin.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  try {
    const [stats, pending] = await Promise.all([getAdminStats(), getPendingApprovals()])
    return NextResponse.json({ success: true, stats, pending })
  } catch (error) {
    console.error('admin overview error', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load admin overview' },
      { status: 500 }
    )
  }
}

