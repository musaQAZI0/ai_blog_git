import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">Skrzypecki</span>
              <span className="text-xl font-light">Blog</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-md">
              Profesjonalna platforma edukacyjna z zakresu okulistyki dla pacjentow
              i specjalistow medycznych.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Nawigacja</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/patient"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Blog dla Pacjentow
                </Link>
              </li>
              <li>
                <Link
                  href="/professional"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Blog dla Specjalistow
                </Link>
              </li>
              <li>
                <Link
                  href="https://skrzypecki.pl"
                  className="text-sm text-muted-foreground hover:text-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Strona glowna
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Prawne</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Polityka Prywatnosci
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Regulamin
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Polityka Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {currentYear} Dr hab. n. med. Janusz Skrzypecki. Wszelkie prawa zastrzezone.
          </p>
        </div>
      </div>
    </footer>
  )
}
