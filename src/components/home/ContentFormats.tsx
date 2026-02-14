'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

type FormatKey = 'explainers' | 'clinical' | 'research' | 'checklists'

const FORMATS: Array<{ key: FormatKey; title: string; lead: string; details: string[] }> = [
  {
    key: 'explainers',
    title: 'Patient explainers',
    lead: 'Plain-language articles focused on symptoms, treatment, and next steps.',
    details: ['What is urgent vs normal', 'At-home care and monitoring', 'How to prepare for a visit'],
  },
  {
    key: 'clinical',
    title: 'Clinical summaries',
    lead: 'Structured notes for clinicians and medical professionals.',
    details: ['Decision pathways', 'Treatment outlines', 'Red flags and differential'],
  },
  {
    key: 'research',
    title: 'Research highlights',
    lead: 'What’s new in the literature and how to interpret it.',
    details: ['Key numbers', 'Limitations and bias', 'Practical takeaways'],
  },
  {
    key: 'checklists',
    title: 'Checklists & workflows',
    lead: 'Actionable lists you can use immediately.',
    details: ['Pre-procedure preparation', 'Aftercare expectations', 'Follow-up questions'],
  },
]

export function ContentFormats() {
  const [openKey, setOpenKey] = React.useState<FormatKey | null>('explainers')

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-black">Content types</h2>
        <p className="mt-2 max-w-2xl text-sm text-black/70">
          Click a card to see what the format includes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FORMATS.map((format) => {
          const isOpen = openKey === format.key

          return (
            <button
              key={format.key}
              type="button"
              onClick={() => setOpenKey((prev) => (prev === format.key ? null : format.key))}
              className={cn(
                'text-left rounded-2xl border border-black/10 bg-white p-5 transition-colors hover:bg-black/[0.02]',
                isOpen && 'border-black/20'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-black">{format.title}</p>
                  <p className="mt-2 text-sm text-black/70">{format.lead}</p>
                </div>
                <ChevronDown
                  className={cn('mt-1 h-4 w-4 flex-shrink-0 text-black/70 transition-transform', isOpen && 'rotate-180')}
                />
              </div>

              {isOpen && (
                <ul className="mt-4 space-y-2 text-sm text-black/70">
                  {format.details.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
