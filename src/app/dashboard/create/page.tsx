'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Select,
  Label,
  Alert,
  AlertDescription,
} from '@/components/ui'
import { ArticleCreateData, TargetAudience, AIGenerationResponse } from '@/types'
import { Wand2, FileText, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { normalizeAIGenerationResponse } from '@/lib/ai/normalize'

const PDFUploader = dynamic(
  () => import('@/components/dashboard/PDFUploader').then((mod) => mod.PDFUploader),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl border border-border bg-card/80 p-5 md:p-7">
        <div className="h-[260px] animate-pulse rounded-2xl bg-muted" />
      </div>
    ),
  }
)

const ArticleEditor = dynamic(
  () => import('@/components/dashboard/ArticleEditor').then((mod) => mod.ArticleEditor),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    ),
  }
)

type GenerationStage = 'extracting' | 'generating' | 'finalizing'

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || ''
  const coarsePointer =
    typeof window !== 'undefined' ? window.matchMedia?.('(pointer: coarse)').matches : false

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || Boolean(coarsePointer)
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try
  {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally
  {
    clearTimeout(timeoutId)
  }
}

async function readJsonResponse(response: Response): Promise<any> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(text.slice(0, 240) || 'Nieprawidlowa odpowiedz serwera')
  }
}

function sanitizeGeneratedPayload(data: AIGenerationResponse): AIGenerationResponse {
  const payload = normalizeAIGenerationResponse(data)
  const seoTitle = (payload.seoMeta?.title || payload.title || '').slice(0, 60)
  const seoDescription = (payload.seoMeta?.description || payload.excerpt || '').slice(0, 160)

  return {
    ...payload,
    seoMeta: {
      ...payload.seoMeta,
      title: seoTitle,
      description: seoDescription,
    },
  } as AIGenerationResponse
}

function isNetworkFetchFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return error.name === 'TypeError' && (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed')
  )
}

function CreateArticleContent() {
  const { user, firebaseUser } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'generate' | 'edit'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('patient')
  const [generating, setGenerating] = useState(false)
  const [generationStage, setGenerationStage] = useState<GenerationStage | null>(null)
  const [generatedContent, setGeneratedContent] = useState<AIGenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const lockedTargetAudience: TargetAudience | null =
    user?.role === 'admin'
      ? null
      : user?.role === 'professional'
        ? 'professional'
        : user?.role === 'patient'
          ? 'patient'
          : null

  React.useEffect(() => {
    if (lockedTargetAudience)
    {
      setTargetAudience(lockedTargetAudience)
    }
  }, [lockedTargetAudience])

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles)
    setError(null)
  }

  const runOptimizedGeneration = async () => {
    setGenerating(true)
    setGenerationStage(null)
    setError(null)

    try
    {
      const idToken = await firebaseUser?.getIdToken?.()
      if (!idToken) {
        throw new Error('Sesja logowania wygasla. Zaloguj sie ponownie przed generowaniem artykulu.')
      }
      const isMobile = isMobileBrowser()
      const extractTimeout = isMobile ? 90000 : 120000
      const headers = { authorization: `Bearer ${idToken}` }
      const audience = lockedTargetAudience || targetAudience

      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      formData.append('action', 'extract')
      formData.append('targetAudience', audience)

      setGenerationStage('extracting')
      let extractedPdfContent = ''

      try
      {
        const extractResponse = await fetchWithTimeout(
          '/api/ai/generate',
          {
            method: 'POST',
            body: formData,
            headers,
          },
          extractTimeout
        )
        const extractPayload = await readJsonResponse(extractResponse)

        if (!extractResponse.ok)
        {
          throw new Error(extractPayload.error || 'Nie udalo sie przetworzyc pliku PDF')
        }

        extractedPdfContent = String(extractPayload?.data?.pdfContent || '')
      } catch (extractErr)
      {
        if (extractErr instanceof Error && extractErr.name === 'AbortError')
        {
          throw new Error(
            isMobile
              ? 'Przetwarzanie PDF trwa zbyt dlugo. Sprobuj polaczyc sie z WiFi lub uzyc krotszego pliku.'
              : 'Przetwarzanie PDF trwa zbyt dlugo. Sprobuj z mniejszym plikiem PDF.'
          )
        }
        throw extractErr
      }

      setGenerationStage('generating')

      const requestGeneration = async (options?: {
        provider?: 'gemini' | 'openai'
        maxChars?: number
      }) => {
        const provider = options?.provider || 'gemini'
        const maxChars = options?.maxChars || (audience === 'professional' ? 24000 : 8000)
        const bodyPdfContent = maxChars
          ? extractedPdfContent.slice(0, maxChars)
          : extractedPdfContent

        const response = await fetch(
          '/api/ai/generate',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              ...(headers || {}),
            },
            body: JSON.stringify({
              action: 'generate',
              pdfContent: bodyPdfContent,
              targetAudience: audience,
              provider,
              generateImage: true,
              generationMode: 'full',
            }),
          }
        )
        const data = await readJsonResponse(response)

        if (!response.ok)
        {
          throw new Error(data?.error || 'Blad generowania artykulu')
        }

        return sanitizeGeneratedPayload(data.data as AIGenerationResponse)
      }

      try
      {
        setGenerationStage('generating')
        const sanitized = await requestGeneration({
          provider: 'gemini',
          maxChars: audience === 'professional' ? 24000 : 8000,
        })

        setGenerationStage('finalizing')
        setGeneratedContent(sanitized)
        setStep('edit')
      } catch (generateErr)
      {
        if (isNetworkFetchFailure(generateErr) || generateErr instanceof Error)
        {
          console.warn('[create-article] Primary generation failed; retrying with compact OpenAI fallback')
          setGenerationStage('generating')
          try
          {
            const sanitized = await requestGeneration({
              provider: 'openai',
              maxChars: audience === 'professional' ? 20000 : 6000,
            })
            setGenerationStage('finalizing')
            setGeneratedContent(sanitized)
            setStep('edit')
            return
          } catch (retryErr)
          {
            throw new Error(
              retryErr instanceof Error
                ? `Generowanie nie powiodlo sie po probie awaryjnej: ${retryErr.message}`
                : 'Generowanie nie powiodlo sie po probie awaryjnej.'
            )
          }
        }

        if (generateErr instanceof Error && generateErr.name === 'AbortError')
        {
          throw new Error(
            'Polaczenie zostalo przerwane przez przegladarke podczas generowania. Sprobuj ponownie bez odswiezania strony.'
          )
        }
        throw generateErr
      }
    } catch (err)
    {
      console.error('[create-article] Generation error:', err)
      setError(err instanceof Error ? err.message : 'Wystapil blad')
    } finally
    {
      setGenerationStage(null)
      setGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (files.length === 0)
    {
      setError('Wybierz co najmniej jeden plik PDF')
      return
    }

    const useOptimizedFlow = typeof window !== 'undefined'
    if (useOptimizedFlow)
    {
      return runOptimizedGeneration()
    }

    setGenerating(true)
    setError(null)

    try
    {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      formData.append('targetAudience', lockedTargetAudience || targetAudience)

      const idToken = await firebaseUser?.getIdToken?.()

      // Detect mobile and adjust timeout accordingly
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const timeoutDuration = isMobile ? 180000 : 120000 // 3 min for mobile, 2 min for desktop

      // Create AbortController with adaptive timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)

      console.log(`[create-article] Starting generation (${isMobile ? 'mobile' : 'desktop'}, ${timeoutDuration / 1000}s timeout)`)

      try
      {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          body: formData,
          headers: idToken ? { authorization: `Bearer ${idToken}` } : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok)
        {
          const data = await response.json()
          throw new Error(data.error || 'Błąd generowania artykułu')
        }

        const data = await response.json()
        const sanitized = (() => {
          const payload = normalizeAIGenerationResponse(data.data as AIGenerationResponse)
          // Clamp SEO fields to form limits to avoid validation errors.
          const seoTitle = (payload.seoMeta?.title || payload.title || '').slice(0, 60)
          const seoDescription = (payload.seoMeta?.description || payload.excerpt || '')
            .slice(0, 160)
          return {
            ...payload,
            seoMeta: {
              ...payload.seoMeta,
              title: seoTitle,
              description: seoDescription,
            },
          } as AIGenerationResponse
        })()

        setGeneratedContent(sanitized)
        setStep('edit')
      } catch (fetchErr)
      {
        clearTimeout(timeoutId)
        // Handle abort/timeout errors with user-friendly message
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError')
        {
          const minutes = Math.floor(timeoutDuration / 60000)
          throw new Error(
            `Generowanie trwało zbyt długo (>${minutes} min). ` +
            (isMobile
              ? 'Spróbuj połączyć się z WiFi lub użyj krótszego pliku PDF.'
              : 'Spróbuj z mniejszym plikiem PDF lub szybszym połączeniem.')
          )
        }
        throw fetchErr
      }
    } catch (err)
    {
      console.error('[create-article] Generation error:', err)
      setError(err instanceof Error ? err.message : 'Wystapil blad')
    } finally
    {
      setGenerating(false)
    }
  }

  const handleSave = async (data: ArticleCreateData, publish: boolean) => {
    if (!user) return

    setSaving(true)
    try
    {
      const { createArticle, publishArticle } = await import('@/lib/firebase/articles')
      const normalizedData: ArticleCreateData = {
        ...data,
        targetAudience: lockedTargetAudience || data.targetAudience,
      }
      const articleId = await createArticle(normalizedData, user.id, user.name)

      if (publish)
      {
        await publishArticle(articleId)
      }

      router.push('/dashboard/articles')
    } catch (err)
    {
      setError(err instanceof Error ? err.message : 'Błąd zapisu artykułu')
    } finally
    {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrot do panelu
        </Link>
        <h1 className="text-[clamp(1.85rem,5vw,2.5rem)] font-semibold tracking-tight text-foreground">Utworz nowy artykul</h1>
        <p className="mt-3 max-w-2xl text-foreground/75">
          Wgraj dokumenty PDF i pozwol AI wygenerować treść artykułu
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generating && generationStage && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground/70">
          {generationStage === 'extracting' && 'Etap 1 z 3: wyodrebnianie tekstu z PDF.'}
          {generationStage === 'generating' && 'Etap 2 z 3: generowanie artykulu z retry i fallbackiem modeli.'}
          {generationStage === 'finalizing' && 'Etap 3 z 3: finalizowanie tresci i przygotowanie edytora.'}
        </div>
      )}

      {step === 'upload' && (
        <Card className="overflow-hidden border-border bg-card/85 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.2)]">
          <CardHeader className="border-b border-border/70 pb-5">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5" />
              Krok 1: Wgraj dokumenty
            </CardTitle>
            <CardDescription className="text-foreground/70">
              Wgraj jeden lub wiecej plikow PDF, na podstawie ktorych AI wygeneruje artykul
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PDFUploader
              onFilesSelected={handleFilesSelected}
              disabled={generating}
              maxFiles={typeof window !== 'undefined' && isMobileBrowser() ? 2 : 5}
              maxTotalSizeMb={typeof window !== 'undefined' && isMobileBrowser() ? 12 : 30}
            />

            <div className="rounded-2xl border border-border bg-muted/70 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Grupa docelowa</Label>
                  {lockedTargetAudience ? (
                    <Select
                      id="targetAudience"
                      value={lockedTargetAudience}
                      disabled
                      options={[
                        lockedTargetAudience === 'patient'
                          ? { value: 'patient', label: 'Pacjenci (prosty jezyk)' }
                          : { value: 'professional', label: 'Specjalisci (jezyk techniczny)' },
                      ]}
                    />
                  ) : (
                    <Select
                      id="targetAudience"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                      options={[
                        { value: 'patient', label: 'Pacjenci (prosty jezyk)' },
                        { value: 'professional', label: 'Specjalisci (jezyk techniczny)' },
                      ]}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={files.length === 0 || generating}
                className="w-full rounded-full bg-foreground px-6 text-background hover:bg-foreground/80 disabled:bg-muted disabled:text-muted-foreground sm:w-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {generationStage === 'extracting'
                      ? 'Wyodrebnianie PDF...'
                      : generationStage === 'generating'
                        ? 'Generowanie artykulu...'
                        : 'Finalizowanie...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generuj artykul
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'edit' && generatedContent && (
        <Card className="overflow-hidden border-border bg-card/85 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.2)]">
          <CardHeader className="border-b border-border/70 pb-5">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Wand2 className="h-5 w-5" />
              Krok 2: Edytuj i opublikuj
            </CardTitle>
            <CardDescription className="text-foreground/70">
              Przejrzyj wygenerowana treść i wprowadź ewentualne poprawki
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ArticleEditor
              initialData={{
                title: generatedContent.title,
                content: generatedContent.content,
                excerpt: generatedContent.excerpt,
                targetAudience,
                tags: generatedContent.suggestedTags,
                seoMeta: generatedContent.seoMeta,
                coverImage: generatedContent.generatedImageUrl,
              }}
              lockedTargetAudience={lockedTargetAudience || undefined}
              onSave={handleSave}
              loading={saving}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CreateArticleLoadingShell() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrot do panelu
        </Link>
        <h1 className="text-[clamp(1.85rem,5vw,2.5rem)] font-semibold tracking-tight text-foreground">Utworz nowy artykul</h1>
        <p className="mt-3 max-w-2xl text-foreground/75">
          Wgraj dokumenty PDF i pozwol AI wygenerowaÄ‡ treÅ›Ä‡ artykuÅ‚u
        </p>
      </div>

      <Card className="overflow-hidden border-border bg-card/85 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.2)]">
        <CardHeader className="border-b border-border/70 pb-5">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5" />
            Krok 1: Wgraj dokumenty
          </CardTitle>
          <CardDescription className="text-foreground/70">
            Wgraj jeden lub wiecej plikow PDF, na podstawie ktorych AI wygeneruje artykul
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-3xl border border-border bg-card/80 p-5 md:p-7">
            <div className="h-[260px] animate-pulse rounded-2xl bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CreateArticlePage() {
  return (
    <ProtectedRoute
      requireAdmin
      requireApproved={false}
      loadingFallback={<CreateArticleLoadingShell />}
    >
      <CreateArticleContent />
    </ProtectedRoute>
  )
}
