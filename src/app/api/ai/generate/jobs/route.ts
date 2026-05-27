import { NextRequest, NextResponse } from 'next/server'
import { createGenerationJob } from '@/lib/ai/generation-jobs.server'
import { getRequestUser } from '@/lib/auth/server'
import { AIGenerationMode, AIProvider, TargetAudience } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

function parseProvider(value: string | null | undefined): AIProvider {
  if (value === 'openai' || value === 'claude' || value === 'gemini') return value
  return 'gemini'
}

function parseGenerationMode(value: unknown): AIGenerationMode {
  return value === 'fast' ? 'fast' : 'full'
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)

  if (user.role !== 'admin' || !user.uid) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: user.role === 'guest' ? 401 : 403 }
    )
  }

  const body = (await request.json().catch(() => null)) as
    | {
        pdfContent?: string
        targetAudience?: TargetAudience
        provider?: string
        generateImage?: boolean
        generationMode?: string
        clientJobId?: string
      }
    | null

  const pdfContent = typeof body?.pdfContent === 'string' ? body.pdfContent : ''
  const targetAudience = body?.targetAudience
  const clientJobId =
    typeof body?.clientJobId === 'string' && /^[a-zA-Z0-9_-]{12,80}$/.test(body.clientJobId)
      ? body.clientJobId
      : undefined

  if (!targetAudience || !['patient', 'professional'].includes(targetAudience)) {
    return NextResponse.json(
      { success: false, error: 'Nieprawidlowa grupa docelowa' },
      { status: 400 }
    )
  }

  if (!pdfContent || pdfContent.length < 100) {
    return NextResponse.json(
      { success: false, error: 'Brak przygotowanej tresci PDF do generowania.' },
      { status: 400 }
    )
  }

  const jobId = await createGenerationJob({
    jobId: clientJobId,
    createdBy: user.uid,
    pdfContent,
    targetAudience,
    provider: parseProvider(body?.provider),
    generateImage: body?.generateImage !== false,
    generationMode: parseGenerationMode(body?.generationMode),
  })

  return NextResponse.json(
    { success: true, data: { jobId } },
    {
      status: 202,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  )
}
