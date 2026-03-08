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
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <span translate="no" className="text-lg font-bold tracking-tight text-black">
                Skrzypecki Blog
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-black/50">
              Profesjonalna platforma edukacyjna z zakresu okulistyki dla pacjentow i specjalistow medycznych.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-black/40">Nawigacja</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/patient" className="text-sm text-black/60 transition-colors hover:text-black">
                  Blog dla Pacjentow
                </Link>
              </li>
              <li>
                <Link href="/professional" className="text-sm text-black/60 transition-colors hover:text-black">
                  Blog dla Specjalistow
                </Link>
              </li>
              <li>
                <Link
                  href="https://skrzypecki.pl"
                  className="text-sm text-black/60 transition-colors hover:text-black"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Strona glowna
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-black/40">Informacje</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/privacy" className="text-sm text-black/60 transition-colors hover:text-black">
                  Prywatnosc
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

      <div className="border-t border-black/5">
        <div className={cn('mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10', containerClassName)}>
          <p className="text-xs text-black/40">
            &copy; {currentYear} Dr hab. n. med. Janusz Skrzypecki. Wszelkie prawa zastrzezone.
          </p>
        </div>
      </div>
    </footer>
  )
}
