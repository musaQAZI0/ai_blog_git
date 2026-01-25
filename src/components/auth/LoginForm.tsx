'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui'
import { signIn } from '@/lib/firebase/auth'

const loginSchema = z.object({
  email: z.string().email('Podaj prawidlowy adres email'),
  password: z.string().min(6, 'Haslo musi miec co najmniej 6 znakow'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setError(null)

    const result = await signIn(data.email, data.password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="jan@example.pl"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" required>
            Haslo
          </Label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Zapomniales hasla?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="********"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <Button type="submit" className="w-full" isLoading={loading}>
        Zaloguj sie
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Nie masz konta?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Zarejestruj sie
        </Link>
      </p>
    </form>
  )
}
