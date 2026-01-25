import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regulamin',
  description: 'Regulamin korzystania z bloga Dr Skrzypecki',
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold">Regulamin</h1>

      <div className="prose max-w-none dark:prose-invert">
        <p className="text-muted-foreground">
          Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
        </p>

        <h2>1. Postanowienia ogolne</h2>
        <p>
          Niniejszy regulamin okresla zasady korzystania z platformy blogowej
          prowadzonej przez Dr hab. n. med. Janusza Skrzypeckiego.
        </p>

        <h2>2. Definicje</h2>
        <ul>
          <li><strong>Platforma</strong> - serwis internetowy dostepny pod adresem blog.skrzypecki.pl</li>
          <li><strong>Uzytkownik</strong> - osoba korzystajaca z Platformy</li>
          <li><strong>Specjalista</strong> - zweryfikowany profesjonalista medyczny</li>
          <li><strong>Administrator</strong> - wlasciciel i operator Platformy</li>
        </ul>

        <h2>3. Rodzaje kont</h2>
        <h3>3.1 Konto Pacjenta</h3>
        <p>
          Dostep do tresci przeznaczonych dla pacjentow nie wymaga rejestracji.
          Tresci te maja charakter edukacyjny i nie stanowia porady medycznej.
        </p>

        <h3>3.2 Konto Specjalisty</h3>
        <p>
          Rejestracja konta specjalisty wymaga:
        </p>
        <ul>
          <li>Podania prawdziwych danych osobowych</li>
          <li>Podania numeru PWZ lub innego numeru rejestracyjnego</li>
          <li>Weryfikacji przez Administratora</li>
        </ul>

        <h2>4. Zasady korzystania</h2>
        <ul>
          <li>Uzytkownik zobowiazuje sie do podawania prawdziwych danych</li>
          <li>Zabrania sie udostepniania danych logowania osobom trzecim</li>
          <li>Zabrania sie kopiowania i rozpowszechniania tresci bez zgody</li>
          <li>Specjalista zobowiazuje sie do etycznego wykorzystania tresci</li>
        </ul>

        <h2>5. Tresci na Platformie</h2>
        <p>
          Tresci publikowane na Platformie maja charakter edukacyjny i informacyjny.
          Nie stanowia one porady medycznej ani nie zastepuja konsultacji z lekarzem.
        </p>

        <h2>6. Prawa autorskie</h2>
        <p>
          Wszystkie tresci publikowane na Platformie sa chronione prawem autorskim.
          Kopiowanie, rozpowszechnianie lub wykorzystywanie tresci bez zgody
          Administratora jest zabronione.
        </p>

        <h2>7. Odpowiedzialnosc</h2>
        <p>
          Administrator nie ponosi odpowiedzialnosci za:
        </p>
        <ul>
          <li>Decyzje medyczne podjete na podstawie tresci Platformy</li>
          <li>Przerwy w dzialaniu Platformy</li>
          <li>Utrate danych z przyczyn niezaleznych od Administratora</li>
        </ul>

        <h2>8. Zakonczenie korzystania</h2>
        <p>
          Uzytkownik moze w kazdej chwili usunac swoje konto. Administrator
          zastrzega sobie prawo do zawieszenia lub usuniecia konta naruszajacego
          regulamin.
        </p>

        <h2>9. Zmiany regulaminu</h2>
        <p>
          Administrator zastrzega sobie prawo do zmiany regulaminu. O zmianach
          uzytkownicy zostana poinformowani z wyprzedzeniem.
        </p>

        <h2>10. Kontakt</h2>
        <p>
          W sprawach zwiazanych z regulaminem prosimy o kontakt:
          kontakt@skrzypecki.pl
        </p>
      </div>
    </div>
  )
}
