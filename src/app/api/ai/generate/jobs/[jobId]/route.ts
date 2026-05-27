import { NextRequest, NextResponse } from 'next/server'
import { getGenerationJob } from '@/lib/ai/generation-jobs.server'
import { getRequestUser } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const user = await getRequestUser(request)

  if (user.role !== 'admin' || !user.uid) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: user.role === 'guest' ? 401 : 403 }
    )
  }

  const job = await getGenerationJob(params.jobId)
  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Nie znaleziono zadania generowania.' },
      { status: 404 }
    )
  }

  if (job.createdBy !== user.uid) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        stage: job.stage,
        error: job.error,
        result: job.result,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  )
}
