import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Polityka Cookies',
  description: 'Polityka cookies bloga Dr Skrzypecki',
}

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold">Polityka Cookies</h1>

      <div className="prose max-w-none dark:prose-invert">
        <p className="text-muted-foreground">
          Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
        </p>

        <h2>1. Czym sa pliki cookies?</h2>
        <p>
          Pliki cookies (ciasteczka) to niewielkie pliki tekstowe, ktore sa
          przechowywane na Twoim urzadzeniu podczas odwiedzania strony internetowej.
          Sluza one do zapamietywania Twoich preferencji i ulatwienia korzystania
          z serwisu.
        </p>

        <h2>2. Jakich cookies uzywamy?</h2>

        <h3>Cookies niezbedne</h3>
        <p>
          Te cookies sa wymagane do prawidlowego funkcjonowania strony. Obejmuja
          one m.in.:
        </p>
        <ul>
          <li>Cookies sesji użytkownika</li>
          <li>Cookies uwierzytelniania</li>
          <li>Cookies bezpieczenstwa</li>
        </ul>

        <h3>Cookies funkcjonalne</h3>
        <p>
          Pozwalaja zapamietac Twoje preferencje, takie jak:
        </p>
        <ul>
          <li>Preferencje jezykowe</li>
          <li>Ustawienia wyswietlania</li>
          <li>Zgoda na cookies</li>
        </ul>

        <h3>Cookies analityczne</h3>
        <p>
          Pomagają nam zrozumiec, jak użytkownicy korzystają z naszej strony:
        </p>
        <ul>
          <li>Liczba odwiedzin</li>
          <li>Czas spedzony na stronie</li>
          <li>Najpopularniejsze treści</li>
        </ul>

        <h2>3. Jak zarządzać cookies?</h2>
        <p>
          Możesz zarządzać ustawieniami cookies w swójej przeglądarce:
        </p>
        <ul>
          <li>Chrome: Ustawienia &gt; Prywatnosc i bezpieczenstwo &gt; Pliki cookie</li>
          <li>Firefox: Opcje &gt; Prywatnosc i bezpieczenstwo &gt; Ciasteczka</li>
          <li>Safari: Preferencje &gt; Prywatnosc &gt; Zarządzaj danymi witryn</li>
          <li>Edge: Ustawienia &gt; Pliki cookie i uprawnienia witryn</li>
        </ul>

        <h2>4. Wyłączenie cookies</h2>
        <p>
          Wyłączenie cookies może ograniczyc funkcjonalnosc strony. Niektórzy
          funkcje, takie jak logowanie czy zapamietywanie preferencji, moga
          przestac dzialac prawidlowo.
        </p>

        <h2>5. Zmiany w polityce</h2>
        <p>
          Zastrzegamy sobie prawo do wprowadźania zmian w niniejszej polityce.
          O istotnych zmianach poinformujemy użytkowników za pośrednictwem strony.
        </p>

        <h2>6. Kontakt</h2>
        <p>
          W razie pytan dotyczacych polityki cookies prosimy o kontakt:
          kontakt@skrzypecki.pl
        </p>
      </div>
    </div>
  )
}
