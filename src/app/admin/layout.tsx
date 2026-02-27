'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin' },
  { label: 'Uzytkownicy', href: '/admin/users' },
  { label: 'Artykuly', href: '/admin/articles' },
  { label: 'Analityka', href: '/admin/analytics' },
  { label: 'Ustawienia', href: '/admin/settings' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="w-full">
      <div className="sticky top-[72px] z-30 border-y border-black/[0.06] bg-white/95 backdrop-blur">
        <nav className="mx-auto w-full max-w-7xl overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-max items-center gap-2">
            {ADMIN_NAV.map((item) => {
              const active =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm transition-colors',
                    active
                      ? 'bg-black text-white'
                      : 'text-black/60 hover:bg-black/[0.04] hover:text-black'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
      {children}
    </div>
  )
}
