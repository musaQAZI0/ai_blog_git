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
  Badge,
} from '@/components/ui'
import { Article, ArticleCreateData, TargetAudience } from '@/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Eye, Edit, Save, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

const articleSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  content: z.string().min(100, 'Content must be at least 100 characters'),
  excerpt: z.string().min(20, 'Excerpt must be at least 20 characters').max(300),
  targetAudience: z.enum(['patient', 'professional']),
  tags: z.string(),
  seoTitle: z.string().max(60, 'SEO title can have max 60 characters'),
  seoDescription: z.string().max(160, 'SEO description can have max 160 characters'),
  seoKeywords: z.string(),
})

type ArticleFormData = z.infer<typeof articleSchema>

interface ArticleEditorProps {
  initialData?: Partial<Article>
  lockedTargetAudience?: TargetAudience
  onSave: (data: ArticleCreateData, publish: boolean) => Promise<void>
  loading?: boolean
  draftButtonLabel?: string
  publishButtonLabel?: string
  hideDraftButton?: boolean
  hidePublishButton?: boolean
}

export function ArticleEditor({
  initialData,
  lockedTargetAudience,
  onSave,
  loading,
  draftButtonLabel,
  publishButtonLabel,
  hideDraftButton = false,
  hidePublishButton = false,
}: ArticleEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      excerpt: initialData?.excerpt || '',
      targetAudience: lockedTargetAudience || initialData?.targetAudience || 'patient',
      tags: initialData?.tags?.join(', ') || '',
      seoTitle: initialData?.seoMeta?.title || '',
      seoDescription: initialData?.seoMeta?.description || '',
      seoKeywords: initialData?.seoMeta?.keywords?.join(', ') || '',
    },
  })

  const targetAudience = watch('targetAudience')
  const content = watch('content')
  const effectiveAudience = lockedTargetAudience || (targetAudience as TargetAudience)

  const draftLabel = draftButtonLabel || 'Save draft'
  const publishLabel = publishButtonLabel || 'Publish'

  const handleSave = async (data: ArticleFormData, publish: boolean) => {
    setError(null)
    try {
      const audience = (lockedTargetAudience || data.targetAudience) as TargetAudience
      const articleData: ArticleCreateData = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        targetAudience: audience,
        category: audience,
        tags: data.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        seoMeta: {
          title: data.seoTitle || data.title,
          description: data.seoDescription || data.excerpt,
          keywords: data.seoKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        },
      }

      if (initialData?.coverImage) {
        articleData.coverImage = initialData.coverImage
      }

      await onSave(articleData, publish)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-md border border-muted bg-muted/30 p-1">
          <Button
            type="button"
            variant={previewMode ? 'ghost' : 'secondary'}
            size="sm"
            onClick={() => setPreviewMode(false)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant={previewMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode(true)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>

        <div className="flex gap-2">
          {!hideDraftButton && (
            <Button
              variant="outline"
              onClick={handleSubmit((data) => handleSave(data, false))}
              disabled={loading}
            >
              <Save className="mr-2 h-4 w-4" />
              {draftLabel}
            </Button>
          )}
          {!hidePublishButton && (
            <Button
              onClick={handleSubmit((data) => handleSave(data, true))}
              disabled={loading}
            >
              <Send className="mr-2 h-4 w-4" />
              {publishLabel}
            </Button>
          )}
        </div>
      </div>

      <div className={cn(previewMode ? 'hidden' : 'block', 'space-y-6')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title" required>
              Article title
            </Label>
            <Input
              id="title"
              placeholder="Enter article title"
              error={errors.title?.message}
              {...register('title')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience" required>
              Audience
            </Label>
            {lockedTargetAudience ? (
              <>
                <Select
                  id="targetAudience"
                  disabled
                  value={lockedTargetAudience}
                  options={[
                    lockedTargetAudience === 'patient'
                      ? { value: 'patient', label: 'Patient' }
                      : { value: 'professional', label: 'Professional' },
                  ]}
                  error={errors.targetAudience?.message}
                />
                <input
                  type="hidden"
                  value={lockedTargetAudience}
                  {...register('targetAudience')}
                />
              </>
            ) : (
              <Select
                id="targetAudience"
                options={[
                  { value: 'patient', label: 'Patient' },
                  { value: 'professional', label: 'Professional' },
                ]}
                error={errors.targetAudience?.message}
                {...register('targetAudience')}
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content" required>
            Content (Markdown)
          </Label>
          <Textarea
            id="content"
            placeholder="Enter article content in Markdown..."
            className="min-h-[400px] font-sans"
            error={errors.content?.message}
            {...register('content')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="excerpt" required>
            Excerpt
          </Label>
          <Textarea
            id="excerpt"
            placeholder="Short summary for list views"
            className="min-h-[80px]"
            error={errors.excerpt?.message}
            {...register('excerpt')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input
            id="tags"
            placeholder="e.g. glaucoma, cataract, treatment"
            error={errors.tags?.message}
            {...register('tags')}
          />
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <h3 className="mb-4 font-semibold">SEO settings</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seoTitle">SEO title (max 60 chars)</Label>
              <Input
                id="seoTitle"
                placeholder="Search title"
                error={errors.seoTitle?.message}
                {...register('seoTitle')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoDescription">SEO description (max 160 chars)</Label>
              <Textarea
                id="seoDescription"
                placeholder="Search description"
                className="min-h-[60px]"
                error={errors.seoDescription?.message}
                {...register('seoDescription')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoKeywords">SEO keywords (comma separated)</Label>
              <Input
                id="seoKeywords"
                placeholder="e.g. eye, vision, retina"
                error={errors.seoKeywords?.message}
                {...register('seoKeywords')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={cn(previewMode ? 'block' : 'hidden')}>
        <div className="rounded-lg border bg-background p-6">
          <Badge className="mb-4">
            {effectiveAudience === 'professional' ? 'Professional' : 'Patient'}
          </Badge>
          <h1 className="mb-4 text-3xl font-bold">
            {watch('title') || 'Article title'}
          </h1>
          <p className="mb-6 text-lg text-muted-foreground">
            {watch('excerpt') || 'Article excerpt...'}
          </p>
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || '*Article content preview will appear here...*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
