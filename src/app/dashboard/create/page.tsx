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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui'
import { createArticle, publishArticle } from '@/lib/firebase/articles'
import { ArticleCreateData, AIProvider, TargetAudience, AIGenerationResponse } from '@/types'
import { Wand2, FileText, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

function CreateArticleContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'generate' | 'edit'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [aiProvider, setAIProvider] = useState<AIProvider>('openai')
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('patient')
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<AIGenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
      formData.append('provider', aiProvider)
      formData.append('targetAudience', targetAudience)

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Blad generowania artykulu')
      }

      const data = await response.json()
      setGeneratedContent(data.data)
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
      const articleId = await createArticle(data, user.id, user.name)

      if (publish) {
        await publishArticle(articleId)
      }

      router.push('/dashboard/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad zapisu artykulu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrot do panelu
        </Link>
        <h1 className="text-3xl font-bold">Utworz nowy artykul</h1>
        <p className="mt-1 text-muted-foreground">
          Wgraj dokumenty PDF i pozwol AI wygenerowac tresc artykulu
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Krok 1: Wgraj dokumenty
            </CardTitle>
            <CardDescription>
              Wgraj jeden lub wiecej plikow PDF, na podstawie ktorych AI wygeneruje artykul
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PDFUploader onFilesSelected={handleFilesSelected} disabled={generating} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="aiProvider">Dostawca AI</Label>
                <Select
                  id="aiProvider"
                  value={aiProvider}
                  onChange={(e) => setAIProvider(e.target.value as AIProvider)}
                  options={[
                    { value: 'openai', label: 'OpenAI GPT-4' },
                    { value: 'claude', label: 'Claude (Anthropic)' },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Grupa docelowa</Label>
                <Select
                  id="targetAudience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  options={[
                    { value: 'patient', label: 'Pacjenci (prosty jezyk)' },
                    { value: 'professional', label: 'Specjalisci (jezyk techniczny)' },
                  ]}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={files.length === 0 || generating}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Krok 2: Edytuj i opublikuj
            </CardTitle>
            <CardDescription>
              Przejrzyj wygenerowana tresc i wprowadz ewentualne poprawki
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ArticleEditor
              initialData={{
                title: generatedContent.title,
                content: generatedContent.content,
                excerpt: generatedContent.excerpt,
                category: generatedContent.suggestedCategory,
                targetAudience,
                tags: generatedContent.suggestedTags,
                seoMeta: generatedContent.seoMeta,
                coverImage: generatedContent.generatedImageUrl,
              }}
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
    <ProtectedRoute requireApproved>
      <CreateArticleContent />
    </ProtectedRoute>
  )
}
