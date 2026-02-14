import Link from 'next/link'
import { Button } from '@/components/ui'
import { BookOpen, Users } from 'lucide-react'
import { AudienceExplorer } from '@/components/home/AudienceExplorer'
import { ContentFormats } from '@/components/home/ContentFormats'
import { AiPublishingPipeline } from '@/components/home/AiPublishingPipeline'

export default function HomePage() {
  return (
    <section className="mx-auto max-w-[980px] text-left">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-black/60">AI-powered medical blog</p>
      <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-black sm:text-6xl">
        Ophthalmology content for patients and medical professionals
      </h1>
      <p className="mt-5 max-w-3xl text-base text-black/70">
        Choose a reading path: patient-friendly education or verified professional content. The publishing workflow is AI-assisted: upload one or more PDFs, generate SEO-ready drafts with images, then review before publishing.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-black bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-black">
              <BookOpen className="h-4 w-4" />
              Medical professional blog
            </div>
            <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">Polecane</span>
          </div>
          <p className="mt-3 text-sm text-black/70">
            Login required. Register as a doctor or other medical professional and provide a PWZ / professional registration number.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-black/70">
            <li>Clinical summaries, research highlights, practical algorithms</li>
            <li>Tracked access for the professional area</li>
            <li>AI-assisted publishing from PDFs with SEO + images</li>
          </ul>
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button className="h-10 rounded-full bg-black px-6 text-white hover:bg-black/80" asChild>
                <Link href="/professional">Open pro blog</Link>
              </Button>
              <Button variant="outline" className="h-10 rounded-full border-2 border-black px-6" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button variant="outline" className="h-10 rounded-full border-2 border-black px-6" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-black">
            <Users className="h-4 w-4" />
            Patient blog
          </div>
          <p className="mt-3 text-sm text-black/70">
            Simple, practical, and safety-first articles about eye health.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-black/70">
            <li>Clear definitions and what it means for you</li>
            <li>Search and filters to find topics fast</li>
            <li>Optional AI draft generation from PDFs</li>
          </ul>
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="h-10 rounded-full border-2 border-black px-6" asChild>
                <Link href="/patient">Browse patient blog</Link>
              </Button>
              <Button className="h-10 rounded-full bg-black px-6 text-white hover:bg-black/80" asChild>
                <Link href="/patient/generate">Generate article</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <AudienceExplorer />
      </div>

      <div className="mt-6">
        <AiPublishingPipeline />
      </div>

      <div className="mt-6">
        <ContentFormats />
      </div>

    </section>
  )
}
