'use client'

import React from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger, Button } from '@/components/ui'

type PipelineKey = 'patient' | 'professional'

const PIPELINES: Record<PipelineKey, { title: string; lead: string; steps: string[]; outputs: string[]; cta: { label: string; href: string }[] }> = {
  patient: {
    title: 'Patient blog pipeline',
    lead: 'Clear, safe, and practical articles for patients — optimized for SEO and readability.',
    steps: ['Upload one or more PDFs', 'AI extracts key points and structure', 'Draft article + SEO meta', 'Generate a cover image', 'Review and publish'],
    outputs: ['Patient-friendly language', 'SEO title, description, keywords', 'Suggested sections (symptoms, when to seek help, next steps)', 'Cover image ready for sharing'],
    cta: [
      { label: 'Browse patient blog', href: '/patient' },
      { label: 'Generate patient article', href: '/patient/generate' },
    ],
  },
  professional: {
    title: 'Medical professional pipeline',
    lead: 'Verified access for clinicians and medical professionals, with tracked usage and editorial workflow.',
    steps: ['Login / register (PWZ / registration number)', 'Upload one or more PDFs', 'AI generates clinical draft + SEO meta', 'Generate a cover image', 'Edit, approve, and publish'],
    outputs: ['Clinician-grade structure and tone', 'Evidence-focused summaries and key numbers', 'SEO-ready metadata', 'Tracked access for the professional area'],
    cta: [
      { label: 'Login', href: '/login' },
      { label: 'Register', href: '/register' },
      { label: 'Open pro blog', href: '/professional' },
      { label: 'Open editor', href: '/dashboard/create' },
    ],
  },
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm text-black/70">
      {items.map((line) => (
        <li key={line} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  )
}

export function AiPublishingPipeline() {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-black">AI-powered publishing</h2>
        <p className="mt-2 max-w-3xl text-sm text-black/70">
          The blog has two content pipelines: one for patients and one for verified medical professionals. Upload PDFs, generate SEO-ready drafts, add images, then review before publishing.
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
          const pipeline = PIPELINES[key]
          return (
            <TabsContent key={key} value={key} className="mt-5">
              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <h3 className="text-base font-semibold text-black">{pipeline.title}</h3>
                  <p className="mt-2 text-sm text-black/70">{pipeline.lead}</p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
                      <p className="text-sm font-semibold text-black">Pipeline steps</p>
                      <BulletList items={pipeline.steps} />
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
                      <p className="text-sm font-semibold text-black">What you get</p>
                      <BulletList items={pipeline.outputs} />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {pipeline.cta.map((action) => (
                      <Button
                        key={action.href}
                        asChild
                        variant={action.href === '/patient/generate' || action.href === '/dashboard/create' ? 'default' : 'outline'}
                        className={
                          action.href === '/patient/generate' || action.href === '/dashboard/create'
                            ? 'h-10 rounded-full bg-black px-5 text-white hover:bg-black/80'
                            : 'h-10 rounded-full border-2 border-black px-5'
                        }
                      >
                        <Link href={action.href}>{action.label}</Link>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <p className="text-sm font-semibold text-black">Compliance & tracking</p>
                  <p className="mt-2 text-sm text-black/70">
                    Professional access is verified and aligned with GDPR principles (data minimization, consent, and transparency). The professional area supports tracking and moderation.
                  </p>
                  <BulletList
                    items={[
                      'GDPR consent on registration and cookie consent banner',
                      'Verified specialist registration (PWZ / registration number)',
                      'Account approval flow for professional access',
                      'Usage tracking and analytics for professional content',
                    ]}
                  />
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
