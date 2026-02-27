import { Footer } from '@/components/layout/Footer'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 pb-20">{children}</main>
      <Footer />
    </div>
  )
}
