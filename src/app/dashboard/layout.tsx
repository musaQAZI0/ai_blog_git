import type { Metadata } from 'next'

export const metadata: Metadata = {
  other: {
    // Prevent browser auto-translate from mutating React-managed DOM, which can trigger
    // NotFoundError: Failed to execute 'removeChild' on 'Node' in dev during updates.
    google: 'notranslate',
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div translate="no">{children}</div>
}

