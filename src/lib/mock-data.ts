import { Article, User } from '@/types'

// Demo mode flag
export const isDemoMode = typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// Mock user for demo
export const mockUser: User = {
  id: 'demo-user-1',
  email: 'demo@skrzypecki.pl',
  name: 'Dr Jan Kowalski',
  role: 'professional',
  professionalType: 'lekarz',
  registrationNumber: '1234567',
  specialization: 'Okulistyka',
  status: 'approved',
  createdAt: new Date(),
  updatedAt: new Date(),
  newsletterSubscribed: true,
  gdprConsent: true,
  gdprConsentDate: new Date(),
}

// Mock articles for demo
export const mockPatientArticles: Article[] = [
  {
    id: '1',
    title: 'Jak dbac o zdrowie oczu na co dzien',
    slug: 'jak-dbac-o-zdrowie-oczu',
    content: `# Jak dbac o zdrowie oczu na co dzien

Zdrowie oczu jest niezwykle wazne dla naszej codziennej funkcjonalnosci. W tym artykule przedstawimy praktyczne porady, ktore pomoga Ci chronic wzrok.

## Regularne badania okulistyczne

Regularne wizyty u okulisty sa kluczowe dla wczesnego wykrywania schorzen oczu. Zaleca sie badanie co najmniej raz w roku.

## Odpowiednia dieta

Dieta bogata w witaminy A, C i E oraz kwasy omega-3 wspiera zdrowie oczu. Jedz duzo:
- Marchwi
- Szpinaku
- Ryb
- Orzechow

## Ochrona przed sloncem

Zawsze nos okulary przeciwsloneczne z filtrem UV, aby chronic oczy przed szkodliwym promieniowaniem.

## Odpoczynek od ekranow

Stosuj zasade 20-20-20: co 20 minut patrz na cos odleglego o 20 stop przez 20 sekund.`,
    excerpt: 'Poznaj praktyczne porady dotyczace codziennej pielegnacji oczu i profilaktyki schorzen wzroku.',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800',
    category: 'Profilaktyka',
    targetAudience: 'patient',
    authorId: 'demo-author',
    authorName: 'Dr Janusz Skrzypecki',
    status: 'published',
    seoMeta: {
      title: 'Jak dbac o zdrowie oczu - Porady okulisty',
      description: 'Praktyczne porady dotyczace codziennej pielegnacji oczu od doswiadczonego okulisty.',
      keywords: ['zdrowie oczu', 'profilaktyka', 'okulista', 'wzrok'],
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    publishedAt: new Date('2024-01-15'),
    viewCount: 1250,
    tags: ['profilaktyka', 'zdrowie', 'porady'],
  },
  {
    id: '2',
    title: 'Zespol suchego oka - objawy i leczenie',
    slug: 'zespol-suchego-oka',
    content: `# Zespol suchego oka

Zespol suchego oka to powszechna dolegliwosc, ktora dotyka coraz wiecej osob, szczegolnie pracujacych przy komputerze.

## Objawy

- Uczucie piaseku w oczach
- Pieczenie i swedzenie
- Zaczerwienienie
- Zmeczenie oczu
- Problemy z noszeniem soczewek

## Przyczyny

Glowne przyczyny to:
1. Dlugotrwala praca przy ekranie
2. Suche powietrze (klimatyzacja, ogrzewanie)
3. Wiek
4. Niektore leki

## Leczenie

Leczenie obejmuje stosowanie sztucznych lez, zmiane nawykow oraz w niektorych przypadkach specjalistyczne zabiegi.`,
    excerpt: 'Dowiedz sie, jak rozpoznac i leczyc zespol suchego oka - jedna z najczestszych dolegliwosci okulistycznych.',
    coverImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
    category: 'Choroby',
    targetAudience: 'patient',
    authorId: 'demo-author',
    authorName: 'Dr Janusz Skrzypecki',
    status: 'published',
    seoMeta: {
      title: 'Zespol suchego oka - objawy, przyczyny i leczenie',
      description: 'Kompleksowy przewodnik po zespole suchego oka dla pacjentow.',
      keywords: ['suche oko', 'objawy', 'leczenie', 'okulista'],
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    publishedAt: new Date('2024-01-20'),
    viewCount: 890,
    tags: ['suche oko', 'leczenie', 'objawy'],
  },
  {
    id: '3',
    title: 'Soczewki kontaktowe - poradnik dla poczatkujacych',
    slug: 'soczewki-kontaktowe-poradnik',
    content: `# Soczewki kontaktowe - poradnik dla poczatkujacych

Soczewki kontaktowe to wygodna alternatywa dla okularow. Oto co musisz wiedziec przed rozpoczeciem ich uzywania.

## Rodzaje soczewek

- **Jednodniowe** - najbardziej higieniczne
- **Dwutygodniowe** - ekonomiczne rozwiazanie
- **Miesieczne** - wymagaja starannej pielegnacji

## Jak zakladac soczewki

1. Umyj dokladnie rece
2. Wyjmij soczewke z opakowania
3. Sprawdz, czy nie jest odwrocona
4. Delikatnie naloz na oko

## Higiena i bezpieczenstwo

Przestrzegaj zasad higieny, aby uniknac infekcji. Nigdy nie nos soczewek dluzej niz zalecane.`,
    excerpt: 'Kompleksowy poradnik dla osob rozpoczynajacych przygode z soczewkami kontaktowymi.',
    coverImage: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800',
    category: 'Soczewki',
    targetAudience: 'patient',
    authorId: 'demo-author',
    authorName: 'Dr Janusz Skrzypecki',
    status: 'published',
    seoMeta: {
      title: 'Soczewki kontaktowe - poradnik dla poczatkujacych',
      description: 'Wszystko co musisz wiedziec o soczewkach kontaktowych.',
      keywords: ['soczewki kontaktowe', 'poradnik', 'higiena'],
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    publishedAt: new Date('2024-02-01'),
    viewCount: 2100,
    tags: ['soczewki', 'poradnik', 'higiena'],
  },
  {
    id: '4',
    title: 'Zacma - co warto wiedziec',
    slug: 'zacma-co-warto-wiedziec',
    content: `# Zacma - co warto wiedziec

Zacma to jedna z najczestszych przyczyn utraty wzroku u osob starszych. Dobra wiadomosc - jest w pelni uleczalna.

## Czym jest zacma?

Zacma to zmętnienie soczewki oka, ktore powoduje stopniowe pogarszanie widzenia.

## Objawy

- Zamglone widzenie
- Problemy z widzeniem w nocy
- Widzenie aureoli wokol swiatel
- Bladniecie kolorow

## Leczenie

Jedyna skuteczna metoda leczenia jest operacja usunięcia zmętnionej soczewki i zastąpienia jej sztuczną.`,
    excerpt: 'Poznaj przyczyny, objawy i mozliwosci leczenia zacmy - jednej z najczestszych chorob oczu.',
    coverImage: 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=800',
    category: 'Choroby',
    targetAudience: 'patient',
    authorId: 'demo-author',
    authorName: 'Dr Janusz Skrzypecki',
    status: 'published',
    seoMeta: {
      title: 'Zacma - objawy, przyczyny i leczenie',
      description: 'Kompleksowy przewodnik o zacmie dla pacjentow.',
      keywords: ['zacma', 'operacja', 'leczenie', 'wzrok'],
    },
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
    publishedAt: new Date('2024-02-10'),
    viewCount: 1560,
    tags: ['zacma', 'operacja', 'leczenie'],
  },
]

export const mockProfessionalArticles: Article[] = [
  {
    id: '101',
    title: 'Nowe metody leczenia AMD - przeglad literatury',
    slug: 'nowe-metody-leczenia-amd',
    content: `# Nowe metody leczenia AMD - przeglad literatury

## Wprowadzenie

Zwyrodnienie plamki zwiazane z wiekiem (AMD) pozostaje glowna przyczyna utraty wzroku u osob powyzej 50 roku zycia w krajach rozwiniętych.

## Aktualne podejscia terapeutyczne

### Inhibitory VEGF

Iniekcje doszklistkowe inhibitorow VEGF pozostaja standardem leczenia postaci wysiękowej AMD:
- Ranibizumab
- Aflibercept
- Brolucizumab

### Nowe cząsteczki

Faricimab - pierwszy bispesyficzny inhibitor, blokujacy zarówno VEGF-A jak i Ang-2.

## Wnioski

Postep w leczeniu AMD jest dynamiczny. Kluczowe pozostaje wczesne wykrycie i systematyczne leczenie.`,
    excerpt: 'Przeglad najnowszych metod leczenia zwyrodnienia plamki zwiazanego z wiekiem dla specjalistow.',
    coverImage: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
    category: 'Badania',
    targetAudience: 'professional',
    authorId: 'demo-author',
    authorName: 'Dr Janusz Skrzypecki',
    status: 'published',
    seoMeta: {
      title: 'Nowe metody leczenia AMD - przeglad kliniczny',
      description: 'Aktualny przeglad metod leczenia AMD dla okulistow.',
      keywords: ['AMD', 'VEGF', 'leczenie', 'okulistyka'],
    },
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
    publishedAt: new Date('2024-01-25'),
    viewCount: 450,
    tags: ['AMD', 'VEGF', 'badania kliniczne'],
  },
  {
    id: '102',
    title: 'Techniki chirurgii zacmy - update 2024',
    slug: 'techniki-chirurgii-zacmy-2024',
    content: `# Techniki chirurgii zacmy - update 2024

## Fakoemulsyfikacja

Standardowa metoda usuwania zacmy z uzyciem ultradźwięków.

### Parametry optymalne
- Moc ultradźwięków: dostosowana do twardości jądra
- Wysokość butelki: 80-110 cm
- Aspiracja: 350-450 mmHg

## Chirurgia wspomagana laserem femtosekundowym

Zalety:
- Precyzyjne cięcia
- Lepsza centrowość IOL
- Mniejszy obrzęk rogówki

## Dobór soczewek wewnątrzgałkowych

Czynniki do rozważenia:
1. Biometria oka
2. Oczekiwania pacjenta
3. Współistniejące schorzenia`,
    excerpt: 'Aktualizacja technik chirurgii zacmy z uwzglednieniem najnowszych technologii.',
    coverImage: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800',
    category: 'Techniki operacyjne',
    targetAudience: 'professional',
    authorId: 'demo-author',
    authorName: 'Dr Janusz Skrzypecki',
    status: 'published',
    seoMeta: {
      title: 'Chirurgia zacmy 2024 - techniki i postepy',
      description: 'Przeglad wspolczesnych technik chirurgii zacmy dla okulistow.',
      keywords: ['chirurgia zacmy', 'fakoemulsyfikacja', 'IOL'],
    },
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
    publishedAt: new Date('2024-02-05'),
    viewCount: 320,
    tags: ['chirurgia', 'zacma', 'techniki'],
  },
]

// Get mock articles based on audience
export function getMockArticles(targetAudience?: 'patient' | 'professional'): Article[] {
  if (targetAudience === 'patient') {
    return mockPatientArticles
  }
  if (targetAudience === 'professional') {
    return mockProfessionalArticles
  }
  return [...mockPatientArticles, ...mockProfessionalArticles]
}

// Get mock article by slug
export function getMockArticleBySlug(slug: string): Article | null {
  const allArticles = [...mockPatientArticles, ...mockProfessionalArticles]
  return allArticles.find((a) => a.slug === slug) || null
}
