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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createClientJobId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `article-${random.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

function isTransientFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    error.name === 'AbortError' ||
    error.name === 'TypeError' ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('network request failed')
  )
}

async function fetchJsonWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: {
    timeoutMs?: number
    retries?: number
    retryDelayMs?: number
  } = {}
): Promise<{ response: Response; data: any }> {
  const retries = options.retries ?? 2
  const retryDelayMs = options.retryDelayMs ?? 1200
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response =
        options.timeoutMs && options.timeoutMs > 0
          ? await fetchWithTimeout(input, init, options.timeoutMs)
          : await fetch(input, init)
      const data = await readJsonResponse(response)
      return { response, data }
    } catch (error) {
      lastError = error
      if (!isTransientFetchError(error) || attempt === retries) break
      await delay(retryDelayMs * (attempt + 1))
    }
  }

  throw lastError
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
      const extractTimeout = 120000
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
        const { response: extractResponse, data: extractPayload } = await fetchJsonWithRetry(
          '/api/ai/generate',
          {
            method: 'POST',
            body: formData,
            headers,
          },
          {
            timeoutMs: extractTimeout,
            retries: 2,
            retryDelayMs: 1800,
          }
        )

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
            'Przetwarzanie PDF trwa zbyt dlugo. Sprobuj z mniejszym plikiem PDF lub szybszym polaczeniem.'
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
        const clientJobId = createClientJobId()
        let jobId = clientJobId
        let startConfirmed = false

        try {
          const { response: startResponse, data: startData } = await fetchJsonWithRetry(
            '/api/ai/generate/jobs',
            {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                ...(headers || {}),
              },
              cache: 'no-store',
              body: JSON.stringify({
                action: 'generate',
                clientJobId,
                pdfContent: bodyPdfContent,
                targetAudience: audience,
                provider,
                generateImage: true,
                generationMode: 'full',
              }),
            },
            {
              timeoutMs: 30000,
              retries: 3,
              retryDelayMs: 1500,
            }
          )

          if (!startResponse.ok)
          {
            throw new Error(startData?.error || 'Nie udalo sie uruchomic zadania generowania')
          }

          jobId = String(startData?.data?.jobId || clientJobId)
          startConfirmed = true
        } catch (startError) {
          if (!isTransientFetchError(startError)) {
            throw startError
          }
          console.warn('[create-article] Job start response was lost; polling client job id', startError)
        }

        let pollCount = 0
        let consecutivePollFailures = 0
        while (true) {
          if (pollCount > 0) {
            await delay(pollCount < 8 ? 2500 : 5000)
          }
          pollCount += 1

          let statusResponse: Response
          let statusData: any

          try {
            const result = await fetchJsonWithRetry(
              `/api/ai/generate/jobs/${encodeURIComponent(jobId)}`,
              {
                method: 'GET',
                headers,
                cache: 'no-store',
              },
              {
                timeoutMs: 25000,
                retries: 2,
                retryDelayMs: 1500,
              }
            )
            statusResponse = result.response
            statusData = result.data
            consecutivePollFailures = 0
          } catch (pollError) {
            if (isTransientFetchError(pollError) && consecutivePollFailures < 18) {
              consecutivePollFailures += 1
              console.warn(
                `[create-article] Poll failed (${consecutivePollFailures}); keeping job alive`,
                pollError
              )
              continue
            }
            throw pollError
          }

          if (!statusResponse.ok) {
            if (!startConfirmed && statusResponse.status === 404 && pollCount <= 12) {
              continue
            }
            throw new Error(statusData?.error || 'Nie udalo sie sprawdzic statusu generowania')
          }

          const status = statusData?.data?.status
          if (status === 'completed') {
            return sanitizeGeneratedPayload(statusData.data.result as AIGenerationResponse)
          }
          if (status === 'failed') {
            throw new Error(statusData?.data?.error || 'Generowanie nie powiodlo sie')
          }
        }
      }

      setGenerationStage('generating')
      const sanitized = await requestGeneration({
        provider: 'gemini',
        maxChars: audience === 'professional' ? 24000 : 8000,
      })

      setGenerationStage('finalizing')
      setGeneratedContent(sanitized)
      setStep('edit')
    } catch (err)
    {
      console.error('[create-article] Generation error:', err)
      if (isTransientFetchError(err)) {
        setError(
          'Polaczenie mobilne chwilowo przerwalo kontakt z serwerem. Zadanie moglo nadal dzialac po stronie serwera; odswiez strone dopiero po kilku minutach albo sprobuj ponownie na stabilnym WiFi.'
        )
      } else {
        setError(err instanceof Error ? err.message : 'Wystapil blad')
      }
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

      const isMobile = false
      const timeoutDuration = 180000

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)

      console.log(`[create-article] Starting generation (${timeoutDuration / 1000}s timeout)`)

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
              maxFiles={5}
              maxTotalSizeMb={30}
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
