import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Footer({
  containerClassName,
  wrapperClassName,
}: {
  containerClassName?: string
  wrapperClassName?: string
}) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={cn('border-t border-black/10 bg-white', wrapperClassName)}>
      <div className={cn('mx-auto w-full max-w-7xl px-6 py-10 sm:px-8 lg:px-10', containerClassName)}>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-black">Skrzypecki Blog</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-black/50">
              Profesjonalna platforma edukacyjna z zakresu okulistyki dla pacjentów i specjalistów medycznych.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-black/40">Nawigacja</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/patient" className="text-sm text-black/60 transition-colors hover:text-black">
                  Blog dla Pacjentów
                </Link>
              </li>
              <li>
                <Link href="/professional" className="text-sm text-black/60 transition-colors hover:text-black">
                  Blog dla Specjalistów
                </Link>
              </li>
              <li>
                <Link
                  href="https://skrzypecki.pl"
                  className="text-sm text-black/60 transition-colors hover:text-black"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Strona główna ↗
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-black/40">Informacje</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/privacy" className="text-sm text-black/60 transition-colors hover:text-black">
                  Prywatność
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-black/60 transition-colors hover:text-black">
                  Regulamin
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-black/60 transition-colors hover:text-black">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-black/5">
        <div className={cn('mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10', containerClassName)}>
          <p className="text-xs text-black/40">
            &copy; {currentYear} Dr hab. n. med. Janusz Skrzypecki. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex flex-col text-xs font-bold text-black sm:items-end">
            <p>Powered and Managed by Musa Aamir Qazi</p>
            <a href="mailto:musaqazi54@gmail.com" className="mt-1 transition-colors hover:text-black/80">
              musaqazi54@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
