import { NextRequest, NextResponse } from 'next/server'
import { generateArticle } from '@/lib/ai'
import { extractTextFromMultiplePDFs } from '@/lib/ai/pdf-parser'
import { AIProvider, TargetAudience } from '@/types'
import { getRequestUser } from '@/lib/auth/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

function looksLikeTableRow(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  const numericMatches = trimmed.match(/[-+]?\d+(?:[.,]\d+)?%?/g) || []
  const hasFormulaOrStatsTerm = /\b(SD|RMSAE|MAE|MedAE|PE|Cooke|Kane|Barrett|EVO|Hill|Hoffer|Pearl|SRK|Haigis|Holladay|Olsen|Formula|Formu)/i.test(trimmed)
  return numericMatches.length >= 3 || (numericMatches.length >= 2 && hasFormulaOrStatsTerm)
}

function looksLikeTableCaption(line: string, nextLine: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^\[TABLE:/i.test(trimmed)) return false
  if (/^(table|tabela)\s*\d+/i.test(trimmed)) return true
  if (/^(table|tabela)\s*[:.-]/i.test(trimmed)) return true
  return looksLikeTableRow(nextLine) && /\b(whole|overall|primary|subgroup|short|long|IOL|results|formula|formu|prediction|refractive|eyes|oczu|wynik|tabela)\b/i.test(trimmed)
}

function wrapDetectedTables(text: string): string {
  const lines = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const output: string[] = []
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const nextLine = lines[i + 1] || ''

    if (looksLikeTableCaption(trimmed, nextLine)) {
      if (inTable) {
        output.push('[END TABLE]')
      }
      output.push(`[TABLE: ${trimmed}]`)
      inTable = true
      continue
    }

    if (inTable && !trimmed) {
      const upcoming = lines.slice(i + 1, i + 4).some((candidate) => looksLikeTableRow(candidate))
      if (!upcoming) {
        output.push('[END TABLE]')
        inTable = false
      }
      output.push('')
      continue
    }

    output.push(line)
  }

  if (inTable) {
    output.push('[END TABLE]')
  }

  return output.join('\n')
}

function normalizeExtractedText(text: string): string {
  const withTables = wrapDetectedTables(text || '')
  return withTables
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, 45000)
}

function parseProvider(value: string | null | undefined): AIProvider {
  if (value === 'openai' || value === 'claude' || value === 'gemini') {
    return value
  }
  return 'gemini'
}

function parseGenerateImage(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value !== 'false' && value !== '0'
  return true
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

    const rl = rateLimit(`ai-generate:${ip}`, { limit: 60, windowMs: 60 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, error: 'Za duzo zapytan. Sprobuj ponownie pozniej.' },
        { status: 429 }
      )
    }

    const contentType = request.headers.get('content-type') || ''
    let files: File[] = []
    let pdfContent = ''
    let provider: AIProvider = 'gemini'
    let generateImage = true
    let action = 'generate'
    let targetAudience: TargetAudience | null = null

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => null)) as
        | {
            action?: string
            pdfContent?: string
            targetAudience?: TargetAudience
            provider?: string
            generateImage?: boolean
          }
        | null

      action = body?.action || 'generate'
      pdfContent = typeof body?.pdfContent === 'string' ? body.pdfContent : ''
      provider = parseProvider(body?.provider)
      generateImage = parseGenerateImage(body?.generateImage)
      targetAudience = (body?.targetAudience as TargetAudience | undefined) || null
    } else {
      const formData = await request.formData()
      files = formData.getAll('files') as File[]
      action = String(formData.get('action') || 'generate')
      pdfContent = String(formData.get('pdfContent') || '')
      provider = parseProvider(formData.get('provider') as string | null)
      generateImage = parseGenerateImage(formData.get('generateImage'))
      targetAudience = (formData.get('targetAudience') as TargetAudience | null) || null
    }

    if (!targetAudience || !['patient', 'professional'].includes(targetAudience)) {
      return NextResponse.json(
        { success: false, error: 'Nieprawidlowa grupa docelowa' },
        { status: 400 }
      )
    }

    if (!pdfContent && files.length > 0) {
      const buffers = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer()
          return Buffer.from(arrayBuffer)
        })
      )

      console.log('[api/generate] Extracting text from PDFs...')
      pdfContent = normalizeExtractedText(await extractTextFromMultiplePDFs(buffers))
    } else if (pdfContent) {
      pdfContent = normalizeExtractedText(pdfContent)
    }

    if (!pdfContent || pdfContent.length < 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            action === 'extract'
              ? 'Nie udalo sie wyodrebnic tekstu z plikow PDF'
              : 'Nie udalo sie przygotowac tresci z dokumentu PDF',
        },
        { status: 400 }
      )
    }

    if (action === 'extract') {
      return NextResponse.json({
        success: true,
        data: {
          pdfContent,
          stats: {
            fileCount: files.length,
            normalizedChars: pdfContent.length,
          },
        },
      })
    }

    console.log(`[api/generate] Extracted ${pdfContent.length} characters from PDF`)
    console.log(`[api/generate] Table tags prepared for AI: ${(pdfContent.match(/\[TABLE:/g) || []).length}`)
    console.log(`[api/generate] Starting article generation with ${provider} for ${targetAudience} audience...`)

    const generatedContent = await generateArticle({
      pdfContent,
      targetAudience,
      provider,
      generateImage,
    })

    return NextResponse.json({
      success: true,
      data: generatedContent,
    })
  } catch (error) {
    console.error('[api/generate] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Blad generowania artykulu'
    const lowered = errorMessage.toLowerCase()
    const isTimeout =
      lowered.includes('timeout') || lowered.includes('aborted') || lowered.includes('etimedout')
    const isOverloaded =
      lowered.includes('503') ||
      lowered.includes('service unavailable') ||
      lowered.includes('high demand')

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? 'Przekroczono limit czasu generowania. Sprobuj ponownie lub uzyj krotszego dokumentu PDF.'
          : isOverloaded
            ? 'Dostawca AI jest chwilowo przeciazony. System sprobowal ponownie i uruchomil fallback, ale zadanie nadal sie nie powiodlo.'
            : errorMessage,
      },
      { status: isTimeout ? 504 : isOverloaded ? 503 : 500 }
    )
  }
}
