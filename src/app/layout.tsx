import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CookieConsent } from '@/components/gdpr/CookieConsent'

const inter = Inter({ subsets: ['latin', 'latin-ext'] })

export const metadata: Metadata = {
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
    <html lang="pl" suppressHydrationWarning>
      <body className={inter.className}>
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
