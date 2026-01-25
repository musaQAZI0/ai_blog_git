import { NextRequest, NextResponse } from 'next/server'
import { generateArticle } from '@/lib/ai'
import { extractTextFromMultiplePDFs } from '@/lib/ai/pdf-parser'
import { AIProvider, TargetAudience } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const provider = formData.get('provider') as AIProvider
    const targetAudience = formData.get('targetAudience') as TargetAudience

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nie przeslano plikow' },
        { status: 400 }
      )
    }

    if (!provider || !['openai', 'claude'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Nieprawidlowy dostawca AI' },
        { status: 400 }
      )
    }

    if (!targetAudience || !['patient', 'professional'].includes(targetAudience)) {
      return NextResponse.json(
        { success: false, error: 'Nieprawidlowa grupa docelowa' },
        { status: 400 }
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
        { success: false, error: 'Nie udalo sie wyodrebnic tekstu z plikow PDF' },
        { status: 400 }
      )
    }

    // Generate article using AI
    const generatedContent = await generateArticle({
      pdfContent,
      targetAudience,
      provider,
      generateImage: provider === 'openai', // Only OpenAI can generate images
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
        error: error instanceof Error ? error.message : 'Blad generowania artykulu',
      },
      { status: 500 }
    )
  }
}
