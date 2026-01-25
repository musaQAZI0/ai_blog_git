import { NextRequest, NextResponse } from 'next/server'
import { approveUser } from '@/lib/firebase/admin'
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

    // Approve the user
    await approveUser(userId, reviewerId, notes)

    // Send approval email notification
    try {
      await sendApprovalEmail({
        to: userEmail,
        name: userName,
        approved: true,
      })
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
      // Don't fail the approval if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Użytkownik został zatwierdzony',
    })
  } catch (error) {
    console.error('Error approving user:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd podczas zatwierdzania użytkownika',
      },
      { status: 500 }
    )
  }
}
