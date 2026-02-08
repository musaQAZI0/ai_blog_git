import type { Metadata } from 'next'
import { IBM_Plex_Mono, Manrope } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CookieConsent } from '@/components/gdpr/CookieConsent'

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  other: {
    // Prevent auto-translate from mutating React-managed DOM in dev.
    google: 'notranslate',
  },
  title: {
    default: 'Blog Okulistyczny | Dr Skrzypecki',
    template: '%s | Dr Skrzypecki Blog',
  },
  description:
    'Profesjonalna platforma edukacyjna z zakresu okulistyki dla pacjentow i specjalistow medycznych.',
  keywords: [
    'okulistyka',
    'oftalmologia',
    'blog medyczny',
    'dr skrzypecki',
    'zdrowie oczu',
    'soczewki',
  ],
  authors: [{ name: 'Dr hab. n. med. Janusz Skrzypecki' }],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: 'https://blog.skrzypecki.pl',
    siteName: 'Blog Okulistyczny Dr Skrzypecki',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" suppressHydrationWarning translate="no">
      <body className={`${manrope.variable} ${ibmPlexMono.variable}`} translate="no">
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  )
}
