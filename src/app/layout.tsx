import type { Metadata } from 'next'
import { Noto_Sans, Poppins } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { Header } from '@/components/layout/Header'
import { AppShell } from '@/components/layout/AppShell'
import { CookieConsent } from '@/components/gdpr/CookieConsent'

const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const notoSans = Noto_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-pl-fallback',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

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
  other: {
    google: 'notranslate',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pl"
      translate="no"
      suppressHydrationWarning
      className={`notranslate ${poppins.variable} ${notoSans.variable}`}
    >
      <body className="font-sans antialiased notranslate" suppressHydrationWarning>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <AppShell>{children}</AppShell>
          </div>
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  )
}
