import { Footer } from '@/components/layout/Footer'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <main className="min-h-[calc(100vh-74px)] flex-1 pb-20">{children}</main>
      <Footer />
    </div>
  )
}
