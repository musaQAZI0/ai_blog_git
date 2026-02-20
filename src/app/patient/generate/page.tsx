'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PDFUploader } from '@/components/dashboard/PDFUploader'
import { ArticleEditor } from '@/components/dashboard/ArticleEditor'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { ArticleCreateData, AIGenerationResponse } from '@/types'
import { ArrowLeft, FileText, Loader2, Send, Wand2 } from 'lucide-react'
import { normalizeAIGenerationResponse } from '@/lib/ai/normalize'

export default function PatientGeneratePage() {
  const router = useRouter()
  const { firebaseUser } = useAuth()
  const [step, setStep] = useState<'upload' | 'edit'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<AIGenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
      files.forEach((file) => formData.append('files', file))
      formData.append('targetAudience', 'patient')
      formData.append('provider', 'gemini')

      const idToken = await firebaseUser?.getIdToken?.()

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: idToken ? { authorization: `Bearer ${idToken}` } : undefined,
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Błąd generowania artykułu')
      }

      const payloadData = normalizeAIGenerationResponse(payload.data as AIGenerationResponse)
      const sanitized: AIGenerationResponse = {
        ...payloadData,
        seoMeta: {
          ...payloadData.seoMeta,
          title: (payloadData.seoMeta?.title || payloadData.title || '').slice(0, 60),
          description: (payloadData.seoMeta?.description || payloadData.excerpt || '').slice(
            0,
            160
          ),
        },
      }

      setGeneratedContent(sanitized)
      setStep('edit')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystapil blad')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (data: ArticleCreateData) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/patient/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...data,
          targetAudience: 'patient',
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Błąd zapisu')
      }

      setSubmitted(true)
      // Redirect back to patient blog after a brief confirmation.
      setTimeout(() => router.push('/patient'), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystapil blad')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute requireAdmin requireApproved={false}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10">
        <Link
          href="/patient"
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrot do bloga pacjentow
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Generuj artykul (Pacjent)</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Wgraj dokument PDF, a AI przygotuje przystepny artykul dla pacjentow.
        </p>
      </div>

      <Alert variant="default" className="mb-6 border-border bg-muted/70 text-foreground">
        <AlertDescription>
          Wygenerowany tekst ma charakter informacyjny i nie stanowi porady medycznej.
          Przed publikacja może zostac przekazany do weryfikacji.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {submitted && (
        <Alert variant="success" className="mb-6">
          <AlertDescription>
            Dziekujemy! Artykuł został wyslany do weryfikacji.
          </AlertDescription>
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
              Wgraj jeden lub wiecej plikow PDF, na podstawie ktorych AI wygeneruje artykul.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PDFUploader onFilesSelected={handleFilesSelected} disabled={generating} />

            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={files.length === 0 || generating}
                className="rounded-full bg-foreground px-6 text-background hover:bg-foreground/80 disabled:bg-muted disabled:text-muted-foreground"
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
              <Send className="h-5 w-5" />
              Krok 2: Popraw i wyslij
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Przejrzyj treść i wyslij do weryfikacji (bez rejestracji).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ArticleEditor
              key={generatedContent.title || 'patient-editor'}
              initialData={{
                title: generatedContent.title,
                content: generatedContent.content,
                excerpt: generatedContent.excerpt,
                targetAudience: 'patient',
                tags: generatedContent.suggestedTags,
                seoMeta: generatedContent.seoMeta,
                coverImage: generatedContent.generatedImageUrl,
              }}
              lockedTargetAudience="patient"
              draftButtonLabel="Wyslij do weryfikacji"
              hidePublishButton
              onSave={async (data) => handleSubmit(data)}
              loading={saving}
            />
          </CardContent>
        </Card>
      )}
      </div>
    </ProtectedRoute>
  )
}
