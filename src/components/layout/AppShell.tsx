'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Footer } from '@/components/layout/Footer'
import { cn } from '@/lib/utils'

const SIDE_NAV = [
  { label: 'Blog dla Pacjentów', href: '/patient' },
  { label: 'Blog dla Specjalistów', href: '/professional' },
]

function shouldShowSidebar(pathname: string) {
  if (pathname.startsWith('/admin')) return false
  if (pathname.startsWith('/dashboard')) return false
  if (pathname.startsWith('/login')) return false
  if (pathname.startsWith('/register')) return false
  if (pathname.startsWith('/forgot-password')) return false
  if (pathname.startsWith('/pending-approval')) return false
  return true
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const withSidebar = shouldShowSidebar(pathname)

  if (!withSidebar) {
    return (
      <div className="flex flex-1 flex-col">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 sm:flex">
        {/* Sidebar */}
        <aside className="hidden w-56 flex-shrink-0 self-start sm:sticky sm:top-20 sm:flex sm:h-[calc(100vh-5rem)] sm:flex-col sm:border-r sm:border-black/[0.06]">
          <nav className="flex-1 overflow-y-auto px-4 pt-8 pb-6">
            <div className="space-y-1">
              {SIDE_NAV.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      'group relative block rounded-lg px-3 py-2 text-[14px] transition-all duration-150',
                      isActive
                        ? 'font-semibold text-black'
                        : 'text-black/45 hover:text-black/80'
                    )}
                  >
                    {/* Active indicator — left bar like OpenAI */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-black" />
                    )}
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="pt-8 sm:pl-8 sm:pr-4">
            <main className="flex-1 pb-20">{children}</main>
          </div>
          <Footer containerClassName="sm:pl-8 sm:pr-4" />
        </div>
      </div>
    </div>
  )
}
