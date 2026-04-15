'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const DASHBOARD_NAV = [
  { label: 'Start', href: '/dashboard' },
  { label: 'Artykuly', href: '/dashboard/articles' },
  { label: 'Nowy', href: '/dashboard/create' },
  { label: 'Ustawienia', href: '/dashboard/settings' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="w-full">
      <div className="sticky top-[72px] z-30 border-y border-black/[0.06] bg-white/95 backdrop-blur">
        <nav className="mx-auto w-full max-w-7xl px-4 py-2 sm:overflow-x-auto sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 sm:min-w-max sm:flex-nowrap">
            {DASHBOARD_NAV.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm transition-colors sm:px-4',
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
