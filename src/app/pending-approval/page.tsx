import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Clock, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Oczekiwanie na weryfikacje',
  description: 'Twoje konto oczekuje na weryfikacje',
}

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 inline-flex rounded-full bg-yellow-100 p-3">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">Oczekiwanie na weryfikacje</CardTitle>
          <CardDescription>
            Dziekujemy za rejestracje! Twoje konto jest obecnie weryfikowane
            przez nasz zespol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Proces weryfikacji może potrwac do 24-48 godzin roboczych.
            Po zatwierdzeniu konta otrzymasz powiadomienie e-mail.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>Sprawdz swója skrzynke email</span>
          </div>

          <div className="pt-4">
            <Button variant="outline" asChild>
              <Link href="/">Powrot do strony glownej</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
