'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PDFUploader } from '@/components/dashboard/PDFUploader'
import { ArticleEditor } from '@/components/dashboard/ArticleEditor'
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
import { createArticle, publishArticle } from '@/lib/firebase/articles'
import { ArticleCreateData, TargetAudience, AIGenerationResponse } from '@/types'
import { Wand2, FileText, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { normalizeAIGenerationResponse } from '@/lib/ai/normalize'

function CreateArticleContent() {
  const { user, firebaseUser } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'generate' | 'edit'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('patient')
  const [generating, setGenerating] = useState(false)
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
    if (lockedTargetAudience) {
      setTargetAudience(lockedTargetAudience)
    }
  }, [lockedTargetAudience])

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles)
    setError(null)
  }

  const handleGenerate = async () => {
    if (files.length === 0) {
      setError('Wybierz co najmniej jeden plik PDF')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      formData.append('targetAudience', lockedTargetAudience || targetAudience)

      const idToken = await firebaseUser?.getIdToken?.()
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        body: formData,
        headers: idToken ? { authorization: `Bearer ${idToken}` } : undefined,
      })

      if (!response.ok) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystapil blad')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async (data: ArticleCreateData, publish: boolean) => {
    if (!user) return

    setSaving(true)
    try {
      const normalizedData: ArticleCreateData = {
        ...data,
        targetAudience: lockedTargetAudience || data.targetAudience,
      }
      const articleId = await createArticle(normalizedData, user.id, user.name)

      if (publish) {
        await publishArticle(articleId)
      }

      router.push('/dashboard/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapisu artykułu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrot do panelu
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Utworz nowy artykul</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Wgraj dokumenty PDF i pozwol AI wygenerować treść artykułu
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'upload' && (
        <Card className="overflow-hidden border-border bg-card/85 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.2)]">
          <CardHeader className="border-b border-border/70 pb-5">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5" />
              Krok 1: Wgraj dokumenty
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Wgraj jeden lub wiecej plikow PDF, na podstawie ktorych AI wygeneruje artykul
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PDFUploader onFilesSelected={handleFilesSelected} disabled={generating} />

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
                    Generowanie...
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
            <CardDescription className="text-muted-foreground">
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

export default function CreateArticlePage() {
  return (
    <ProtectedRoute requireAdmin requireApproved={false}>
      <CreateArticleContent />
    </ProtectedRoute>
  )
}
