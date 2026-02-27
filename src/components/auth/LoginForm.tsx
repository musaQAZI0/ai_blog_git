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
  email: z
    .string()
    .trim()
    .min(1, 'Email jest wymagany')
    .email('Podaj prawidlowy adres email'),
  password: z
    .string()
    .min(1, 'Haslo jest wymagane')
    .min(6, 'Haslo musi miec co najmniej 6 znakow'),
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

    console.log('[auth] login submit', { email: data.email })
    const result = await signIn(data.email, data.password)

    if (result.error) {
      console.log('[auth] login error', result.error)
      setError(result.error)
      setLoading(false)
      return
    }

    console.log('[auth] login success, redirecting to /dashboard')
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" suppressHydrationWarning>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2" suppressHydrationWarning>
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          aria-label="Email"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="space-y-2" suppressHydrationWarning>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="password" required>
            Haslo
          </Label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Zapomniales hasła?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          aria-label="Password"
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
