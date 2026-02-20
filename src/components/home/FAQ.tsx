'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Czy treści zastępują wizyte u lekarza?',
    a: 'Nie. To materialy edukacyjne. Przy naglym pogorszeniu widzenia, silnym bolu oka lub urazie skontaktuj sie pilnie z lekarzem.',
  },
  {
    q: 'Skad pochodza informacje?',
    a: 'Stawiamy na podejscie evidence-based. W artykulach opisujemy praktyczne wnioski, a dla specjalistow uwzgledniamy ograniczenia badań.',
  },
  {
    q: 'Jak wybra? wersj? dla pacjenta vs specjalisty?',
    a: 'Dla pacjentow: prosto i praktycznie. Dla specjalistow: kliniczne podsumowania, algorytmy i przeglad literatury. Na stronie glownej możesz przelaczac zakladki.',
  },
  {
    q: 'Jak czesto pojawiaja sie nowe artykuly?',
    a: 'Nowe treści pojawiaja sie regularnie. Najłatwiej śledzić aktualizacje przez sekcje bloga i newsletter.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0)

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-black">FAQ</h2>
        <p className="mt-2 max-w-2xl text-sm text-black/70">Najczęstsze pytania o treści i sposób korzystania z bloga.</p>
      </div>

      <div className="divide-y divide-black/10 rounded-2xl border border-black/10">
        {FAQS.map((item, index) => {
          const isOpen = openIndex === index
          return (
            <div key={item.q} className="bg-white first:rounded-t-2xl last:rounded-b-2xl">
              <button
                type="button"
                onClick={() => setOpenIndex((prev) => (prev === index ? null : index))}
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-black">{item.q}</span>
                {isOpen ? (
                  <Minus className="mt-0.5 h-4 w-4 flex-shrink-0 text-black/70" />
                ) : (
                  <Plus className="mt-0.5 h-4 w-4 flex-shrink-0 text-black/70" />
                )}
              </button>
              <div className={cn('px-5 pb-4 text-sm text-black/70', !isOpen && 'hidden')}>
                {item.a}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
