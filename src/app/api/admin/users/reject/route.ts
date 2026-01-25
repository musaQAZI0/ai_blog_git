import { NextRequest, NextResponse } from 'next/server'
import { rejectUser } from '@/lib/firebase/admin'
import { sendApprovalEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId, reviewerId, notes, userEmail, userName } = await request.json()

    if (!userId || !reviewerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Reject the user
    await rejectUser(userId, reviewerId, notes)

    // Send rejection email notification
    try {
      await sendApprovalEmail({
        to: userEmail,
        name: userName,
        approved: false,
        reason: notes,
      })
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError)
      // Don't fail the rejection if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Użytkownik został odrzucony',
    })
  } catch (error) {
    console.error('Error rejecting user:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd podczas odrzucania użytkownika',
      },
      { status: 500 }
    )
  }
}
