import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Polityka Prywatnosci',
  description: 'Polityka prywatnosci bloga Dr Skrzypecki',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold">Polityka Prywatnosci</h1>

      <div className="prose max-w-none dark:prose-invert">
        <p className="text-muted-foreground">
          Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
        </p>

        <h2>1. Administrator danych</h2>
        <p>
          Administratorem Twoich danych osobowych jest Dr hab. n. med. Janusz Skrzypecki,
          prowadzacy dzialalnosc pod adresem wskazanym na stronie skrzypecki.pl.
        </p>

        <h2>2. Jakie dane zbieramy</h2>
        <p>Zbieramy nastepujace dane osobowe:</p>
        <ul>
          <li>Imie i nazwisko (przy rejestracji)</li>
          <li>Adres email</li>
          <li>Numer PWZ lub inny numer rejestracyjny (dla specjalistow)</li>
          <li>Specjalizacja zawodowa</li>
          <li>Dane techniczne (adres IP, informacje o przegladarce)</li>
        </ul>

        <h2>3. Cel przetwarzania danych</h2>
        <p>Twoje dane przetwarzamy w celu:</p>
        <ul>
          <li>Weryfikacji uprawnien zawodowych</li>
          <li>Swiadczenia uslug dostepnych na platformie</li>
          <li>Wysylki newslettera (jesli wyrazisz zgode)</li>
          <li>Analizy statystycznej i poprawy jakosci uslug</li>
          <li>Wypelnienia obowiazkow prawnych</li>
        </ul>

        <h2>4. Podstawa prawna</h2>
        <p>Przetwarzamy dane na podstawie:</p>
        <ul>
          <li>Twojej zgody (art. 6 ust. 1 lit. a RODO)</li>
          <li>Wykonania umowy (art. 6 ust. 1 lit. b RODO)</li>
          <li>Prawnie uzasadnionego interesu administratora (art. 6 ust. 1 lit. f RODO)</li>
        </ul>

        <h2>5. Okres przechowywania danych</h2>
        <p>
          Dane przechowujemy przez okres korzystania z uslugi, a po jej zakonczeniu
          przez okres wymagany przepisami prawa lub do czasu przedawnienia roszczen.
        </p>

        <h2>6. Twoje prawa</h2>
        <p>Masz prawo do:</p>
        <ul>
          <li>Dostepu do swoich danych</li>
          <li>Sprostowania danych</li>
          <li>Usuniecia danych (prawo do bycia zapomnianym)</li>
          <li>Ograniczenia przetwarzania</li>
          <li>Przenoszenia danych</li>
          <li>Sprzeciwu wobec przetwarzania</li>
          <li>Cofniecia zgody w dowolnym momencie</li>
        </ul>

        <h2>7. Eksport danych</h2>
        <p>
          Mozesz w kazdej chwili zazadac eksportu swoich danych w formacie czytelnym
          maszynowo. Aby to zrobic, skontaktuj sie z nami lub skorzystaj z opcji
          w ustawieniach konta.
        </p>

        <h2>8. Usuniecie konta</h2>
        <p>
          Mozesz zazadac calkowitego usuniecia swojego konta i wszystkich powiazanych
          danych. Po potwierdzeniu, dane zostana trwale usuniete w ciagu 30 dni.
        </p>

        <h2>9. Pliki cookies</h2>
        <p>
          Szczegolowe informacje o wykorzystywanych plikach cookies znajdziesz
          w naszej Polityce Cookies.
        </p>

        <h2>10. Kontakt</h2>
        <p>
          W sprawach zwiazanych z ochrona danych osobowych mozesz skontaktowac sie
          z nami pod adresem: kontakt@skrzypecki.pl
        </p>

        <h2>11. Skargi</h2>
        <p>
          Masz prawo zlozyc skarge do organu nadzorczego - Prezesa Urzedu Ochrony
          Danych Osobowych, jesli uznasz, ze przetwarzanie Twoich danych osobowych
          narusza przepisy RODO.
        </p>
      </div>
    </div>
  )
}
