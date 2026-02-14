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
    <footer className={cn('border-t border-black bg-background', wrapperClassName)}>
      <div className={cn('mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8', containerClassName)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="flex-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-black">Skrzypecki Blog</span>
            </Link>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Profesjonalna platforma edukacyjna z zakresu okulistyki dla pacjentów i specjalistów medycznych.
            </p>
          </div>

          <div className="sm:text-right">
            <h3 className="text-sm font-semibold text-foreground">Nawigacja</h3>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/patient" className="text-sm text-muted-foreground hover:text-foreground">
                  Blog dla Pacjentów
                </Link>
              </li>
              <li>
                <Link href="/professional" className="text-sm text-muted-foreground hover:text-foreground">
                  Blog dla Specjalistów
                </Link>
              </li>
              <li>
                <Link
                  href="https://skrzypecki.pl"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Strona główna
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-black -mx-3 sm:-ml-[25px] sm:-mr-0" />

      <div className={cn('mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8', containerClassName)}>
        <div className="flex flex-col gap-2 text-foreground/80 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-1 flex-col gap-1">
            <p className="break-words text-sm">
              &copy; {currentYear} Dr hab. n. med. Janusz Skrzypecki. Wszelkie prawa zastrzeżone.
            </p>
            <a href="mailto:musaqazi54@gmail.com" className="text-sm text-muted-foreground hover:text-foreground">
              Managed and powered by Musa Aamir Qazi
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-shrink-0 sm:justify-end">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Prywatność
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Regulamin
            </Link>
            <Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}