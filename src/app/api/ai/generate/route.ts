import { NextRequest, NextResponse } from 'next/server'
import { generateArticle } from '@/lib/ai'
import { extractTextFromMultiplePDFs } from '@/lib/ai/pdf-parser'
import { AIProvider, TargetAudience } from '@/types'
import { getRequestUser } from '@/lib/auth/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    const ip = getClientIp(request)

    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: user.role === 'guest' ? 401 : 403 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    // Default to Gemini for text generation (can be overridden by passing provider in formData)
    const providerRaw = (formData.get('provider') as string | null) || 'gemini'
    const provider = (['openai', 'claude', 'gemini'].includes(providerRaw)
      ? providerRaw
      : 'gemini') as AIProvider
    const requestedAudience = formData.get('targetAudience') as TargetAudience

    const targetAudience: TargetAudience = requestedAudience

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nie przeslano plikow' },
        { status: 400 }
      )
    }

    if (!targetAudience || !['patient', 'professional'].includes(targetAudience)) {
      return NextResponse.json(
        { success: false, error: 'Nieprawidłowa grupa docelowa' },
        { status: 400 }
      )
    }

    const rl = rateLimit(`ai-generate:${ip}`, { limit: 60, windowMs: 60 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, error: 'Za duzo zapytan. Spróbuj ponownie pozniej.' },
        { status: 429 }
      )
    }

    // Convert files to buffers
    const buffers = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        return Buffer.from(arrayBuffer)
      })
    )

    // Extract text from PDFs
    const pdfContent = await extractTextFromMultiplePDFs(buffers)

    if (!pdfContent || pdfContent.trim().length < 100) {
      return NextResponse.json(
        { success: false, error: 'Nie udało sie wyodrębnić tekstu z plikow PDF' },
        { status: 400 }
      )
    }

    // Generate article using AI
    const generatedContent = await generateArticle({
      pdfContent,
      targetAudience,
      provider,
      // Prefer Gemini for images/graphs; if Gemini isn't configured, OpenAI code can fall back to DALL·E.
      generateImage: true,
    })

    return NextResponse.json({
      success: true,
      data: generatedContent,
    })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd generowania artykułu',
      },
      { status: 500 }
    )
  }
}
