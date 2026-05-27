import { Footer } from '@/components/layout/Footer'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100svh-74px)] flex-1 flex-col">
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
