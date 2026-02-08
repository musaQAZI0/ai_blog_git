import type { Metadata } from 'next'

export const metadata: Metadata = {
  other: {
    // Prevent browser auto-translate from mutating React-managed DOM (dev Fast Refresh issue).
    google: 'notranslate',
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div translate="no">{children}</div>
}
