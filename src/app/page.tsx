import Link from 'next/link'
import { Button, Card, CardContent } from '@/components/ui'
import { Users, Stethoscope, BookOpen, Shield, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-background/85 to-background py-20 sm:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 right-12 hidden h-72 w-72 rounded-full bg-primary/30 blur-[120px] lg:block" />
          <div className="absolute bottom-0 left-[-10%] h-72 w-72 rounded-full bg-accent/30 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-[0.5em] text-muted-foreground/70">
            Blog okularny
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Wiedza okulistyczna z troska o pacjenta
            <span className="block text-accent">
              Dr hab. n. med. Janusz Skrzypecki
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Profesjonalna platforma edukacyjna z zakresu okulistyki. Wybierz swoja
            sciezke, aby uzyskac dostep do specjalistycznych tresci.
          </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button className="px-8 text-sm shadow-2xl" asChild>
                <Link href="/patient">Przejdz do tresci dla pacjentow</Link>
              </Button>
              <Button variant="outline" className="px-8 text-sm text-foreground" asChild>
                <Link href="/professional">Logowanie specjalistow</Link>
              </Button>
            </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-muted/50 bg-card/60 px-5 py-6">
              <p className="text-3xl font-semibold text-accent">1000+</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Przeprowadzonych operacji
              </p>
            </div>
            <div className="rounded-2xl border border-muted/50 bg-card/60 px-5 py-6">
              <p className="text-3xl font-semibold text-accent">15+</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Lat doswiadczenia w chirurgii oczu
              </p>
            </div>
            <div className="rounded-2xl border border-muted/50 bg-card/60 px-5 py-6">
              <p className="text-3xl font-semibold text-accent">1%</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Reklamacji po zabiegach
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Selection */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Wybierz swoja sciezke
            </h2>
            <p className="mt-4 text-muted-foreground">
              Nasze tresci sa dostosowane do Twoich potrzeb
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {/* Patient Path */}
            <Card className="group relative overflow-hidden rounded-[2rem] border border-muted/40 bg-card/70 transition-all hover:border-accent/40 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-transparent to-transparent opacity-80" />
              <CardContent className="relative z-10 p-8">
                <div className="mb-6 inline-flex rounded-2xl bg-accent/10 p-3 text-accent">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-2xl font-bold tracking-tight">Dla Pacjentow</h3>
                <p className="mb-6 text-muted-foreground">
                  Przystepne artykuly o zdrowiu oczu, schorzeniach okulistycznych
                  i profilaktyce. Bez koniecznosci rejestracji.
                </p>
                <ul className="mb-6 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Artykuly edukacyjne
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Porady profilaktyczne
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Bez rejestracji
                  </li>
                </ul>
                <Button asChild className="w-full group-hover:bg-primary/90">
                  <Link href="/patient">
                    Przejdz do bloga
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Professional Path */}
            <Card className="group relative overflow-hidden rounded-[2rem] border border-muted/40 bg-card/70 transition-all hover:border-accent/40 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-transparent to-transparent opacity-80" />
              <CardContent className="relative z-10 p-8">
                <div className="mb-6 inline-flex rounded-2xl bg-accent/10 p-3 text-accent">
                  <Stethoscope className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-2xl font-bold tracking-tight">Dla Specjalistow</h3>
                <p className="mb-6 text-muted-foreground">
                  Specjalistyczne tresci dla lekarzy, optometrystow i innych
                  profesjonalistow medycznych. Wymaga weryfikacji.
                </p>
                <ul className="mb-6 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Artykuly kliniczne
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Weryfikowane konta
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Spolecznosc specjalistow
                  </li>
                </ul>
                <Button asChild className="w-full group-hover:bg-primary/90">
                  <Link href="/professional">
                    Zaloguj sie
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-muted/60 bg-background/40 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Dlaczego nasz blog?</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Zaufane zrodlo informacji dla pacjentow i specjalistow - wszystkie
              tresci tworzone sa w oparciu o doswiadczenie kliniczne i najnowsze
              wytyczne.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-muted/40 bg-card/60 p-6 text-left transition hover:border-accent/40 hover:bg-card/80">
              <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-accent">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Ekspertyza medyczna</h3>
              <p className="text-sm text-muted-foreground">
                Tresci tworzone przez doswiadczonego specjaliste okulistyki.
              </p>
            </div>

            <div className="rounded-2xl border border-muted/40 bg-card/60 p-6 text-left transition hover:border-accent/40 hover:bg-card/80">
              <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-accent">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Wiarygodne zrodla</h3>
              <p className="text-sm text-muted-foreground">
                Artykuly oparte na aktualnych badaniach i wytycznych medycznych.
              </p>
            </div>

            <div className="rounded-2xl border border-muted/40 bg-card/60 p-6 text-left transition hover:border-accent/40 hover:bg-card/80">
              <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-accent">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Dostosowane tresci</h3>
              <p className="text-sm text-muted-foreground">
                Osobne sciezki dla pacjentow i specjalistow medycznych.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
