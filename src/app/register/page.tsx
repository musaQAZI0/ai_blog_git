import { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Rejestracja',
  description: 'Za• konto specjalisty medycznego',
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Rejestracja specjalisty</CardTitle>
          <CardDescription>
            Za• konto, aby uzyskac dostep do specjalistycznych treści.
            Twoje konto zostanie zweryfikowane przez administratora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  )
}
