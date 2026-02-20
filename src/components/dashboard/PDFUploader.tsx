'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Sparkles } from 'lucide-react'
import { Button, Alert, AlertDescription } from '@/components/ui'
import { cn } from '@/lib/utils'

interface PDFUploaderProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  disabled?: boolean
}

export function PDFUploader({
  onFilesSelected,
  maxFiles = 5,
  disabled,
}: PDFUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const totalSizeMb = files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setError(null)

      if (rejectedFiles.length > 0) {
        setError('Niektóre pliki zostały odrzucone. Akceptujemy tylko pliki PDF.')
        return
      }

      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`Możesz dodac maksymalnie ${maxFiles} plikow.`)
        return
      }

      const newFiles = [...files, ...acceptedFiles]
      setFiles(newFiles)
      onFilesSelected(newFiles)
    },
    [files, maxFiles, onFilesSelected]
  )

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesSelected(newFiles)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: maxFiles - files.length,
    disabled,
  })

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/80 p-5 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.2)] md:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_52%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.7),transparent_58%)]" />
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Codex Input
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Upload source PDFs for generation
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag files into the workspace or click to attach. Keep inputs concise and relevant.
            </p>
          </div>

          <div
            {...getRootProps()}
            className={cn(
              'group cursor-pointer rounded-2xl border border-dashed px-5 py-10 text-center transition-all duration-200',
              isDragActive
                ? 'border-foreground bg-background shadow-[0_0_0_1px_rgba(24,24,24,0.12)_inset]'
                : 'border-border bg-background/90 hover:border-foreground/40 hover:bg-background',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <input {...getInputProps()} />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
              <Upload className="h-6 w-6" />
            </div>
            {isDragActive ? (
              <p className="text-sm font-medium text-foreground">Drop PDFs here...</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Drag and drop PDF files
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse ({maxFiles} max)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Queue</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Files</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{files.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{totalSizeMb.toFixed(2)} MB</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Accepted format: PDF. Keep files under your provider limits for faster processing.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="relative mt-4 border-red-300 bg-red-50">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <div className="relative mt-5 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Selected Files</h4>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="max-w-[36ch] truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => removeFile(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
