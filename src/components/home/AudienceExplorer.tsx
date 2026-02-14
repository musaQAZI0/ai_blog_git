'use client'

import React from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger, Button } from '@/components/ui'

type AudienceKey = 'patient' | 'professional'

const AUDIENCE_COPY: Record<AudienceKey, { title: string; lead: string; chips: string[]; points: string[] }> = {
  patient: {
    title: 'For patients',
    lead:
      'Clear explanations of eye conditions, treatments, and how to prepare for appointments. Practical, readable, and safety-first.',
    chips: ['Cataract', 'Glaucoma', 'AMD', 'Dry eye', 'Tests & procedures', 'Eye drops'],
    points: ['Plain language and definitions', 'Questions to ask your doctor', 'When to seek urgent help'],
  },
  professional: {
    title: 'For medical professionals',
    lead:
      'Clinical summaries, research highlights, and practical takeaways. Access is verified and content is structured for quick review.',
    chips: ['Algorithms', 'Research', 'Cases', 'Pharmacotherapy', 'Surgery', 'Guidelines'],
    points: ['Key numbers and limitations', 'Practical workflows and decision points', 'Verified access and tracked usage'],
  },
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
      {label}
    </span>
  )
}

export function AudienceExplorer() {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-black">Choose your path</h2>
        <p className="mt-2 max-w-2xl text-sm text-black/70">
          Pick the patient or medical professional section. The professional area requires login and specialist registration.
        </p>
      </div>

      <Tabs defaultValue="patient">
        <TabsList className="h-11 rounded-full border border-black/10 bg-white p-1">
          <TabsTrigger
            value="patient"
            className="rounded-full px-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            Patient
          </TabsTrigger>
          <TabsTrigger
            value="professional"
            className="rounded-full px-4 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            Medical professional
          </TabsTrigger>
        </TabsList>

        {(['patient', 'professional'] as const).map((key) => {
          const copy = AUDIENCE_COPY[key]
          return (
            <TabsContent key={key} value={key} className="mt-5">
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <h3 className="text-base font-semibold text-black">{copy.title}</h3>
                  <p className="mt-2 text-sm text-black/70">{copy.lead}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {copy.chips.map((chip) => (
                      <Chip key={chip} label={chip} />
                    ))}
                  </div>

                  {key === 'professional' ? (
                    <div className="mt-5 rounded-2xl border border-black/10 bg-black/[0.02] p-5">
                      <p className="text-sm font-semibold text-black">Registration & verification</p>
                      <ul className="mt-3 space-y-2 text-sm text-black/70">
                        <li className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black" />
                          <span>Login required for the professional blog</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black" />
                          <span>Select your role (doctor or other medical professional)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black" />
                          <span>PWZ / registration number is required to register</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black" />
                          <span>Accounts can be approved by an administrator</span>
                        </li>
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {key === 'patient' ? (
                      <>
                        <Button asChild className="h-10 rounded-full bg-black px-5 text-white hover:bg-black/80">
                          <Link href="/patient">Browse patient blog</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-10 rounded-full border-2 border-black px-5">
                          <Link href="/patient/generate">Generate patient article</Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button asChild className="h-10 rounded-full bg-black px-5 text-white hover:bg-black/80">
                          <Link href="/login">Login</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-10 rounded-full border-2 border-black px-5">
                          <Link href="/register">Register</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
                  <p className="text-sm font-semibold text-black">Typowa struktura artykulu</p>
                  <ul className="mt-3 space-y-2 text-sm text-black/70">
                    {copy.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
