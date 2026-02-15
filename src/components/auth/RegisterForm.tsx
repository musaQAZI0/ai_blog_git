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
    name: z.string().min(2, 'Imie i nazwisko musi miec co najmniej 2 znaki'),
    email: z.string().email('Podaj prawidlowy adres email'),
    password: z.string().min(8, 'Haslo musi miec co najmniej 8 znakow'),
    confirmPassword: z.string(),
    professionalType: z.enum(['lekarz', 'optometrysta', 'other'], {
      required_error: 'Wybierz typ specjalisty',
    }),
    otherProfessionalType: z.string().optional(),
    registrationNumber: z.string().min(1, 'Numer PWZ jest wymagany'),
    specialization: z.string().optional(),
    gdprConsent: z.boolean().refine((val) => val === true, {
      message: 'Musisz wyrazic zgode na przetwarzanie danych',
    }),
    newsletterConsent: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Hasla musza byc takie same',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.professionalType === 'lekarz') {
        return validatePWZ(data.registrationNumber)
      }
      return data.registrationNumber.length >= 3
    },
    {
      message: 'Nieprawidlowy numer PWZ (7 cyfr dla lekarzy)',
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
      newsletterConsent: false,
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
      professionalType: data.professionalType,
      otherProfessionalType: data.otherProfessionalType,
      registrationNumber: data.registrationNumber,
      specialization: data.specialization,
      gdprConsent: data.gdprConsent,
      newsletterConsent: data.newsletterConsent || false,
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
            Rejestracja przebiegla pomyslnie! Twoje konto jest aktywne.
            Mozesz sie teraz zalogowac.
          </AlertDescription>
        </Alert>
        <Button
          variant="link"
          className="mt-4"
          onClick={() => router.push('/login')}
        >
          Przejdz do logowania
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
          Imie i nazwisko
        </Label>
        <Input
          id="name"
          placeholder="Dr Jan Kowalski"
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
          placeholder="jan@example.pl"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password" required>
            Haslo
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="********"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" required>
            Potwierdz haslo
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="********"
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
          placeholder="Wybierz typ"
          error={errors.professionalType?.message}
          {...register('professionalType')}
        />
      </div>

      {professionalType === 'other' && (
        <div className="space-y-2">
          <Label htmlFor="otherProfessionalType" required>
            Okresl typ specjalisty
          </Label>
          <Input
            id="otherProfessionalType"
            placeholder="np. Ortoptysta"
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
          placeholder={professionalType === 'lekarz' ? '1234567' : 'Numer rejestracyjny'}
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
          placeholder="np. Okulistyka"
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
            <span className="text-destructive">*</span> Wyrazam zgode na przetwarzanie
            moich danych osobowych zgodnie z{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Polityka Prywatnosci
            </Link>
            . Rozumiem, ze moje dane beda wykorzystywane do weryfikacji konta i
            swiadczenia uslug.
          </label>
        </div>
        {errors.gdprConsent && (
          <p className="text-xs text-destructive">{errors.gdprConsent.message}</p>
        )}

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="newsletterConsent"
            className="mt-1"
            {...register('newsletterConsent')}
          />
          <label htmlFor="newsletterConsent" className="text-sm">
            Chce otrzymywac newsletter z nowosciami i artykulami medycznymi.
          </label>
        </div>
      </div>

      <Button type="submit" className="w-full" isLoading={loading}>
        Zarejestruj sie
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Masz juz konto?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Zaloguj sie
        </Link>
      </p>
    </form>
  )
}
