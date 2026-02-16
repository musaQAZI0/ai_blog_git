import Link from 'next/link'
import { ArrowRight, BookOpen, Microscope, ShieldCheck, Stethoscope } from 'lucide-react'
import { ContentFormats } from '@/components/home/ContentFormats'
import { Button } from '@/components/ui'

const PATHS = [
  {
    title: 'Patient blog',
    description:
      'Clear, practical articles about eye symptoms, treatments, prevention, and when to seek urgent care.',
    href: '/patient',
    cta: 'Browse patient articles',
    tags: ['No login required', 'Simple language', 'Action-oriented'],
    tone: 'light',
  },
  {
    title: 'Professional blog',
    description:
      'Clinical summaries, research highlights, and decision support content for verified medical professionals.',
    href: '/professional',
    cta: 'Open professional area',
    tags: ['Login required', 'Verified registration', 'Clinical focus'],
    tone: 'dark',
  },
] as const

const TRUST_ITEMS = [
  {
    title: 'Evidence-based content',
    description: 'Articles are built around research-backed recommendations and practical interpretation.',
    icon: Microscope,
  },
  {
    title: 'Clinical perspective',
    description: 'Written with real patient and specialist workflows in mind for fast, useful reading.',
    icon: Stethoscope,
  },
  {
    title: 'Safety-first structure',
    description: 'Every topic prioritizes warning signs, next steps, and clear escalation guidance.',
    icon: ShieldCheck,
  },
] as const

const AUTHOR_HIGHLIGHTS = [
  'Ophthalmologist and eye surgeon with international training',
  'Academic and evidence-focused clinical educator',
  'Focus on cataract, glaucoma, dry eye, and retinal disease care',
] as const

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-black/[0.08] bg-gradient-to-b from-black/[0.03] to-white p-6 sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            Ophthalmology education platform
          </p>
          <h1 className="mt-4 text-[clamp(1.95rem,6vw,3.35rem)] font-semibold leading-[1.08] tracking-tight text-black">
            Clear eye-care guidance for patients and medical professionals.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/65 sm:text-base">
            Learn from evidence-based ophthalmology content created by Dr hab. n. med. Janusz
            Skrzypecki. The platform is organized for fast reading, safer decisions, and better
            follow-up actions.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="h-11 rounded-full bg-black px-6 text-sm text-white hover:bg-black/85">
              <Link href="/patient">Start reading</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full border-black/20 px-6 text-sm text-black hover:bg-black/[0.03]"
            >
              <Link href="https://skrzypecki.pl" target="_blank" rel="noopener noreferrer">
                About the author
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-5 flex items-center gap-2 text-black/45">
          <BookOpen className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Choose your path</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {PATHS.map((path) => (
            <Link
              key={path.title}
              href={path.href}
              className={
                path.tone === 'dark'
                  ? 'group rounded-2xl border border-black bg-black p-6 text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-16px_rgba(0,0,0,0.55)]'
                  : 'group rounded-2xl border border-black/[0.08] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_10px_30px_-16px_rgba(0,0,0,0.22)]'
              }
            >
              <p
                className={
                  path.tone === 'dark' ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-black'
                }
              >
                {path.title}
              </p>
              <p
                className={
                  path.tone === 'dark'
                    ? 'mt-3 text-sm leading-relaxed text-white/70'
                    : 'mt-3 text-sm leading-relaxed text-black/65'
                }
              >
                {path.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {path.tags.map((tag) => (
                  <span
                    key={tag}
                    className={
                      path.tone === 'dark'
                        ? 'rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/75'
                        : 'rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] text-black/55'
                    }
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div
                className={
                  path.tone === 'dark'
                    ? 'mt-5 inline-flex items-center text-sm font-medium text-white/80 transition-colors group-hover:text-white'
                    : 'mt-5 inline-flex items-center text-sm font-medium text-black/55 transition-colors group-hover:text-black'
                }
              >
                {path.cta}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="rounded-2xl border border-black/[0.08] bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05]">
                <Icon className="h-4 w-4 text-black/70" />
              </span>
              <p className="mt-4 text-sm font-semibold text-black">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-black/60">{item.description}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-black/[0.08] bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
          About the author
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-black sm:text-3xl">
          Dr hab. n. med. Janusz Skrzypecki
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/65 sm:text-base">
          Ophthalmologist and eye surgeon with international training in New York, Manchester, and
          Heidelberg, focused on practical and evidence-based eye care education.
        </p>

        <ul className="mt-5 space-y-2">
          {AUTHOR_HIGHLIGHTS.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-black/65">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black/40" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            asChild
            variant="ghost"
            className="h-9 justify-start rounded-full px-4 text-sm text-black/60 hover:text-black"
          >
            <Link href="https://skrzypecki.pl" target="_blank" rel="noopener noreferrer">
              skrzypecki.pl
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="h-9 justify-start rounded-full px-4 text-sm text-black/60 hover:text-black"
          >
            <Link href="https://okulistykaakademicka.pl" target="_blank" rel="noopener noreferrer">
              okulistykaakademicka.pl
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-black/[0.08] bg-white p-6 sm:p-8">
        <ContentFormats />
      </div>
    </section>
  )
}
