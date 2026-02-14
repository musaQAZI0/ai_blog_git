'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Footer } from '@/components/layout/Footer'
import { cn } from '@/lib/utils'

const SIDE_NAV = [
  { label: 'Start', href: '/' },
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

  if (!withSidebar)
  {
    return (
      <>
        <main className="flex-1">{children}</main>
        <Footer />
      </>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 sm:flex sm:gap-0">
        <aside className="hidden w-52 flex-shrink-0 self-start sm:sticky sm:top-32 sm:flex sm:h-[calc(100vh-8rem)] sm:flex-col sm:pr-3">
          <div className="h-8 sm:h-12" />
          <nav className="sidebar-scroll flex-1 overflow-y-auto pr-2 text-sm text-black/70">
            <div className="space-y-5 pb-2">
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
                      'block rounded-md px-2 py-1 text-[15px] text-black/75 transition-colors hover:text-black',
                      isActive && 'bg-black/5 font-semibold text-black'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </aside>

        <div className="hidden w-px flex-shrink-0 flex-col sm:sticky sm:top-32 sm:flex sm:h-[calc(100vh-8rem)]">
          <div className="h-8 sm:h-12" />
          <div className="w-px flex-1 bg-black" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col pb-0 pr-3 sm:pl-6 sm:pr-0">
          <div className="h-8 sm:h-12" />
          <main className="flex-1 pb-20">{children}</main>
          <div className="mt-12">
            <Footer
              wrapperClassName="-mr-3 pr-3 sm:mr-0 sm:pr-0 sm:-ml-[25px] sm:pl-[25px]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
