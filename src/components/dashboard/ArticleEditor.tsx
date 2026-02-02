'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  Alert,
  AlertDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from '@/components/ui'
import { Article, ArticleCreateData, TargetAudience } from '@/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Eye, Edit, Save, Send } from 'lucide-react'

const articleSchema = z.object({
  title: z.string().min(5, 'Tytul musi miec co najmniej 5 znakow'),
  content: z.string().min(100, 'Tresc musi miec co najmniej 100 znakow'),
  excerpt: z.string().min(20, 'Streszczenie musi miec co najmniej 20 znakow').max(300),
  category: z.string().min(1, 'Wybierz kategorie'),
  targetAudience: z.enum(['patient', 'professional']),
  tags: z.string(),
  seoTitle: z.string().max(60, 'Tytul SEO moze miec maks. 60 znakow'),
  seoDescription: z.string().max(160, 'Opis SEO moze miec maks. 160 znakow'),
  seoKeywords: z.string(),
})

type ArticleFormData = z.infer<typeof articleSchema>

interface ArticleEditorProps {
  initialData?: Partial<Article>
  onSave: (data: ArticleCreateData, publish: boolean) => Promise<void>
  loading?: boolean
}

const PATIENT_CATEGORIES = [
  'Zdrowie oczu',
  'Choroby',
  'Leczenie',
  'Profilaktyka',
  'Soczewki',
]

const PROFESSIONAL_CATEGORIES = [
  'Kliniczna',
  'Badania',
  'Techniki operacyjne',
  'Farmakologia',
  'Przypadki',
]

export function ArticleEditor({ initialData, onSave, loading }: ArticleEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      excerpt: initialData?.excerpt || '',
      category: initialData?.category || '',
      targetAudience: initialData?.targetAudience || 'patient',
      tags: initialData?.tags?.join(', ') || '',
      seoTitle: initialData?.seoMeta?.title || '',
      seoDescription: initialData?.seoMeta?.description || '',
      seoKeywords: initialData?.seoMeta?.keywords?.join(', ') || '',
    },
  })

  const targetAudience = watch('targetAudience')
  const content = watch('content')
  const categories =
    targetAudience === 'patient' ? PATIENT_CATEGORIES : PROFESSIONAL_CATEGORIES

  const handleSave = async (data: ArticleFormData, publish: boolean) => {
    setError(null)
    try {
      const articleData: ArticleCreateData = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        category: data.category,
        targetAudience: data.targetAudience as TargetAudience,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
        seoMeta: {
          title: data.seoTitle || data.title,
          description: data.seoDescription || data.excerpt,
          keywords: data.seoKeywords.split(',').map((k) => k.trim()).filter(Boolean),
        },
      }
      if (initialData?.coverImage) {
        articleData.coverImage = initialData.coverImage
      }
      await onSave(articleData, publish)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystapil blad')
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="edit" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="edit">
              <Edit className="mr-2 h-4 w-4" />
              Edycja
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-2 h-4 w-4" />
              Podglad
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSubmit((data) => handleSave(data, false))}
              disabled={loading}
            >
              <Save className="mr-2 h-4 w-4" />
              Zapisz wersje robocza
            </Button>
            <Button
              onClick={handleSubmit((data) => handleSave(data, true))}
              disabled={loading}
            >
              <Send className="mr-2 h-4 w-4" />
              Opublikuj
            </Button>
          </div>
        </div>

        <TabsContent value="edit" className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title" required>
                Tytul artykulu
              </Label>
              <Input
                id="title"
                placeholder="Wprowadz tytul artykulu"
                error={errors.title?.message}
                {...register('title')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience" required>
                Grupa docelowa
              </Label>
              <Select
                id="targetAudience"
                options={[
                  { value: 'patient', label: 'Pacjenci' },
                  { value: 'professional', label: 'Specjalisci medyczni' },
                ]}
                error={errors.targetAudience?.message}
                {...register('targetAudience')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" required>
                Kategoria
              </Label>
              <Select
                id="category"
                options={categories.map((c) => ({ value: c, label: c }))}
                placeholder="Wybierz kategorie"
                error={errors.category?.message}
                {...register('category')}
              />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" required>
              Tresc artykulu (Markdown)
            </Label>
            <Textarea
              id="content"
              placeholder="Wprowadz tresc artykulu w formacie Markdown..."
              className="min-h-[400px] font-mono"
              error={errors.content?.message}
              {...register('content')}
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt" required>
              Streszczenie
            </Label>
            <Textarea
              id="excerpt"
              placeholder="Krotkie streszczenie artykulu (wyswietlane na listach)"
              className="min-h-[80px]"
              error={errors.excerpt?.message}
              {...register('excerpt')}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tagi (oddzielone przecinkami)</Label>
            <Input
              id="tags"
              placeholder="np. okulistyka, zaćma, leczenie"
              error={errors.tags?.message}
              {...register('tags')}
            />
          </div>

          {/* SEO */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-4 font-semibold">Ustawienia SEO</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">Tytul SEO (maks. 60 znakow)</Label>
                <Input
                  id="seoTitle"
                  placeholder="Tytul dla wyszukiwarek"
                  error={errors.seoTitle?.message}
                  {...register('seoTitle')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">
                  Opis SEO (maks. 160 znakow)
                </Label>
                <Textarea
                  id="seoDescription"
                  placeholder="Opis dla wyszukiwarek"
                  className="min-h-[60px]"
                  error={errors.seoDescription?.message}
                  {...register('seoDescription')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoKeywords">
                  Slowa kluczowe (oddzielone przecinkami)
                </Label>
                <Input
                  id="seoKeywords"
                  placeholder="np. okulistyka, oczy, zdrowie"
                  error={errors.seoKeywords?.message}
                  {...register('seoKeywords')}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="rounded-lg border bg-background p-6">
            <Badge className="mb-4">{watch('category') || 'Kategoria'}</Badge>
            <h1 className="mb-4 text-3xl font-bold">
              {watch('title') || 'Tytul artykulu'}
            </h1>
            <p className="mb-6 text-lg text-muted-foreground">
              {watch('excerpt') || 'Streszczenie artykulu...'}
            </p>
            <div className="prose max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || '*Tutaj pojawi sie tresc artykulu...*'}
              </ReactMarkdown>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
