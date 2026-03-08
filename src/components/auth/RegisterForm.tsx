'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Input,
  Label,
  Select,
  Alert,
  AlertDescription,
} from '@/components/ui'
import { registerUser } from '@/lib/firebase/auth'
import { validatePWZ } from '@/lib/utils'

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Imię i nazwisko jest wymagane')
      .min(2, 'Imię i nazwisko musi mieć co najmniej 2 znaki'),
    email: z
      .string()
      .trim()
      .min(1, 'Email jest wymagany')
      .email('Podaj prawidłowy adres email'),
    phoneNumber: z
      .string()
      .trim()
      .min(1, 'Numer telefonu jest wymagany')
      .min(7, 'Numer telefonu jest wymagany')
      .regex(/^\+?[0-9()\-\s]{7,20}$/, 'Podaj prawidłowy numer telefonu'),
    password: z
      .string()
      .min(1, 'Hasło jest wymagane')
      .min(8, 'Hasło musi mieć co najmniej 8 znaków'),
    confirmPassword: z.string().min(1, 'Potwierdzenie hasła jest wymagane'),
    professionalType: z.enum(['lekarz', 'optometrysta', 'other'], {
      required_error: 'Wybierz typ specjalisty',
    }),
    otherProfessionalType: z.string().optional(),
    registrationNumber: z
      .string()
      .trim()
      .min(1, 'Numer PWZ jest wymagany'),
    specialization: z.string().optional(),
    gdprConsent: z.boolean().refine((val) => val === true, {
      message: 'Musisz wyrazić zgodę na przetwarzanie danych',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Hasła muszą być takie same',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.professionalType !== 'other') return true
      return Boolean(data.otherProfessionalType?.trim())
    },
    {
      message: 'Określ typ specjalisty',
      path: ['otherProfessionalType'],
    }
  )
  .refine(
    (data) => {
      if (data.professionalType === 'lekarz') {
        return validatePWZ(data.registrationNumber)
      }
      return data.registrationNumber.length >= 3
    },
    {
      message: 'Nieprawidłowy numer PWZ (7 cyfr dla lekarzy)',
      path: ['registrationNumber'],
    }
  )

type RegisterFormData = z.infer<typeof registerSchema>
type RegisterFormInput = z.input<typeof registerSchema>

const professionalTypeOptions = [
  { value: 'lekarz', label: 'Lekarz' },
  { value: 'optometrysta', label: 'Optometrysta' },
  { value: 'other', label: 'Inny specjalista' },
]

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInput, unknown, RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      gdprConsent: false,
    },
  })

  const professionalType = watch('professionalType')

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    setError(null)

    const result = await registerUser({
      email: data.email,
      password: data.password,
      name: data.name,
      phoneNumber: data.phoneNumber.trim(),
      professionalType: data.professionalType,
      otherProfessionalType: data.otherProfessionalType,
      registrationNumber: data.registrationNumber,
      specialization: data.specialization,
      gdprConsent: data.gdprConsent,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center">
        <Alert variant="success">
          <AlertDescription>
            Rejestracja przebiegła pomyślnie! Twoje konto jest aktywne.
            Możesz się teraz zalogować.
          </AlertDescription>
        </Alert>
        <Button
          variant="link"
          className="mt-4"
          onClick={() => router.push('/login')}
        >
          Przejdź do logowania
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" required>
          Imię i nazwisko
        </Label>
        <Input
          id="name"
          aria-label="Imię i nazwisko"
          error={errors.name?.message}
          {...register('name')}
        />
      </div>

      <div className="space-y-2">
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

      <div className="space-y-2">
        <Label htmlFor="phoneNumber" required>
          Numer telefonu
        </Label>
        <Input
          id="phoneNumber"
          type="tel"
          aria-label="Numer telefonu"
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password" required>
            Hasło
          </Label>
          <Input
            id="password"
            type="password"
            aria-label="Hasło"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" required>
            Potwierdź hasło
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            aria-label="Potwierdź hasło"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="professionalType" required>
          Typ specjalisty
        </Label>
        <Select
          id="professionalType"
          options={professionalTypeOptions}
          aria-label="Typ specjalisty"
          error={errors.professionalType?.message}
          {...register('professionalType')}
        />
      </div>

      {professionalType === 'other' && (
        <div className="space-y-2">
          <Label htmlFor="otherProfessionalType" required>
            Określ typ specjalisty
          </Label>
          <Input
            id="otherProfessionalType"
            aria-label="Określ typ specjalisty"
            error={errors.otherProfessionalType?.message}
            {...register('otherProfessionalType')}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="registrationNumber" required>
          Numer PWZ / Numer rejestracyjny
        </Label>
        <Input
          id="registrationNumber"
          aria-label="Numer PWZ lub numer rejestracyjny"
          error={errors.registrationNumber?.message}
          {...register('registrationNumber')}
        />
        <p className="text-xs text-muted-foreground">
          {professionalType === 'lekarz'
            ? 'Podaj 7-cyfrowy numer PWZ'
            : 'Podaj numer rejestracyjny lub certyfikatu'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="specialization">Specjalizacja</Label>
        <Input
          id="specialization"
          aria-label="Specjalizacja"
          error={errors.specialization?.message}
          {...register('specialization')}
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="gdprConsent"
            className="mt-1"
            {...register('gdprConsent')}
          />
          <label htmlFor="gdprConsent" className="text-sm">
            <span className="text-destructive">*</span> Wyrażam zgodę na przetwarzanie
            moich danych osobowych zgodnie z{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Polityką Prywatności
            </Link>
            . Rozumiem, że moje dane będą wykorzystywane do weryfikacji konta i
            świadczenia usług.
          </label>
        </div>
        {errors.gdprConsent && (
          <p className="text-xs text-destructive">{errors.gdprConsent.message}</p>
        )}

        <p className="text-sm text-muted-foreground">
          Rejestracja automatycznie zapisuje konto do newslettera z aktualizacjami medycznymi.
        </p>
      </div>

      <Button type="submit" className="w-full" isLoading={loading}>
        Zarejestruj się
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Zaloguj się
        </Link>
      </p>
    </form>
  )
}
