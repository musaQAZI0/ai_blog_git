'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
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

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setError(null)

      if (rejectedFiles.length > 0) {
        setError('Niektore pliki zostaly odrzucone. Akceptujemy tylko pliki PDF.')
        return
      }

      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`Mozesz dodac maksymalnie ${maxFiles} plikow.`)
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
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-primary">Upusc pliki tutaj...</p>
        ) : (
          <div>
            <p className="font-medium">
              Przeciagnij i upusc pliki PDF tutaj
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              lub kliknij, aby wybrac pliki (maks. {maxFiles})
            </p>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Wybrane pliki:</h4>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
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
