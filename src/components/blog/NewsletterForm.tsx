'use client'

import React, { useEffect, useState } from 'react'
import { Button, Input, Alert, AlertDescription } from '@/components/ui'
import { Mail } from 'lucide-react'

interface NewsletterFormProps {
  variant?: 'inline' | 'card'
  defaultEmail?: string
}

export function NewsletterForm({ variant = 'inline', defaultEmail }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!defaultEmail) return
    setEmail((prev) => (prev ? prev : defaultEmail))
  }, [defaultEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Nie udało sie zapisac do newslettera')
      }

      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystapil blad')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Alert variant="success">
        <AlertDescription>
          Dziekujemy za zapisanie sie do newslettera!
        </AlertDescription>
      </Alert>
    )
  }

  if (variant === 'card') {
    return (
      <div className="rounded-lg border bg-muted/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Newsletter</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Otrzymuj najnowsze artykuly i aktualnosci medyczne prosto na skrzynke.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Twoj adres email"
            required
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            Zapisz sie
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Możesz zrezygnowac w każdej chwili. Szanujemy Twoją prywatność.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Twoj adres email"
        required
        className="flex-1"
      />
      <Button type="submit" isLoading={loading}>
        Zapisz sie
      </Button>
    </form>
  )
}
