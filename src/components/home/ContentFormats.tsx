'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

type FormatKey = 'explainers' | 'clinical' | 'research' | 'checklists'

const FORMATS: Array<{ key: FormatKey; title: string; lead: string; details: string[] }> = [
  {
    key: 'explainers',
    title: 'Artykuły dla pacjentow',
    lead: 'Proste omowienia objawow, leczenia i kolejnych krokow.',
    details: ['Co jest pilne, a co standardowe', 'Domowa opieka i obserwacja', 'Jak przygotowac sie do wizyty'],
  },
  {
    key: 'clinical',
    title: 'Podsumowania kliniczne',
    lead: 'Ustrukturyzowane materialy dla lekarzy i specjalistow medycznych.',
    details: ['Sciezki decyzyjne', 'Schematy leczenia', 'Objawy alarmowe i diagnostyka roznicowa'],
  },
  {
    key: 'research',
    title: 'Przeglad badań',
    lead: 'Najwazniejsze nowosci z literatury i ich praktyczna interpretacja.',
    details: ['Kluczowe liczby', 'Ograniczenia badań i ryzyko bledow', 'Wnioski do codziennej praktyki'],
  },
  {
    key: 'checklists',
    title: 'Checklisty i workflow',
    lead: 'Listy kontrolne, ktore mozna od razu wdrozyc.',
    details: ['Przygotowanie do zabiegu', 'Zalecenia po leczeniu', 'Pytania kontrolne na kolejna wizyte'],
  },
]

export function ContentFormats() {
  const [openKey, setOpenKey] = React.useState<FormatKey | null>(null)

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/40">
        Typy treści
      </p>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-black sm:text-3xl">
        Co znajdziesz na blogu.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/50">
        Artykuły sa uporzadkowane wedlug ponizszych formatow, aby ulatwic szybkie i czytelne przeglądanie.
      </p>

      <div className="mt-8 space-y-2">
        {FORMATS.map((format) => {
          const isOpen = openKey === format.key

          return (
            <button
              key={format.key}
              type="button"
              onClick={() => setOpenKey((prev) => (prev === format.key ? null : format.key))}
              className={cn(
                'w-full text-left rounded-xl border px-5 py-4 transition-all duration-200',
                isOpen
                  ? 'border-black/15 bg-white shadow-[0_1px_8px_-3px_rgba(0,0,0,0.06)]'
                  : 'border-black/[0.06] bg-white hover:border-black/12 hover:bg-black/[0.01]'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0 text-black/25 transition-transform duration-200',
                      isOpen && 'rotate-90 text-black/50'
                    )}
                  />
                  <span className="text-sm font-semibold text-black">{format.title}</span>
                </div>
                <span className="hidden text-xs text-black/35 sm:block">{format.lead}</span>
              </div>

              {/* Mobile lead */}
              <p className="mt-1.5 pl-[26px] text-xs text-black/40 sm:hidden">{format.lead}</p>

              {isOpen && (
                <div className="mt-3 border-t border-black/[0.04] pt-3 pl-[26px]">
                  <ul className="space-y-1.5">
                    {format.details.map((line) => (
                      <li key={line} className="flex items-center gap-2 text-sm text-black/55">
                        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-black/20" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
