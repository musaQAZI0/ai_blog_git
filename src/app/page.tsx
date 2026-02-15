import Link from 'next/link'
import { Button } from '@/components/ui'
import { ArrowRight } from 'lucide-react'
import { ContentFormats } from '@/components/home/ContentFormats'

export default function HomePage() {
  return (
    <section className="mx-auto max-w-[980px]">
      {/* ── Hero ── */}
      <div className="pb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/40">
          Ophthalmology · Education · Evidence
        </p>
        <h1 className="mt-5 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-black">
          Evidence-based ophthalmology,{' '}
          <span className="text-black/35">for patients and professionals.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-black/55">
          A platform by Dr hab. n. med. Janusz Skrzypecki — ophthalmologist, eye surgeon, and
          researcher trained at Columbia University, Manchester, and Heidelberg.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild className="h-11 rounded-full bg-black px-6 text-sm text-white hover:bg-black/80">
            <Link href="/patient">Browse articles</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 rounded-full px-6 text-sm text-black/60 hover:text-black">
            <Link href="https://skrzypecki.pl" target="_blank" rel="noopener noreferrer">
              About the author <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-black/[0.06]" />

      {/* ── Two Paths ── */}
      <div className="py-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/40">
          Choose your path
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-black sm:text-3xl">
          Two blogs, one platform.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/50">
          Pick the section that fits your background. The professional area requires login and
          specialist verification.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Patient Card */}
          <Link
            href="/patient"
            className="group flex flex-col justify-between rounded-2xl border border-black/[0.08] bg-white p-6 transition-all duration-200 hover:border-black/20 hover:shadow-[0_2px_20px_-6px_rgba(0,0,0,0.08)]"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-sm">
                  👁
                </span>
                <span className="text-sm font-semibold text-black">Patient blog</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-black/55">
                Clear, practical articles about eye health — symptoms, treatments, and when to see a
                doctor. No login required.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Cataract', 'Glaucoma', 'Dry eye', 'AMD'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-xs text-black/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center text-sm font-medium text-black/40 transition-colors group-hover:text-black">
              Browse articles
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Professional Card */}
          <Link
            href="/professional"
            className="group flex flex-col justify-between rounded-2xl border border-black bg-black p-6 text-white transition-all duration-200 hover:shadow-[0_2px_24px_-6px_rgba(0,0,0,0.25)]"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm">
                    🩺
                  </span>
                  <span className="text-sm font-semibold text-white">Professional blog</span>
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white/80">
                  Login required
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                Clinical summaries, research highlights, and decision algorithms. Verified access
                for doctors and medical specialists.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Algorithms', 'Research', 'Cases', 'Surgery'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <span className="text-sm font-medium text-white/50 transition-colors group-hover:text-white">
                Open pro blog
                <ArrowRight className="ml-1.5 inline h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </div>

        {/* Registration note */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-black/[0.02] px-4 py-3">
          <span className="mt-0.5 text-xs text-black/30">ℹ</span>
          <p className="text-xs leading-relaxed text-black/40">
            Professional registration requires a PWZ or equivalent number.{' '}
            <Link href="/register" className="text-black/60 underline underline-offset-2 hover:text-black">
              Register here
            </Link>{' '}
            or{' '}
            <Link href="/login" className="text-black/60 underline underline-offset-2 hover:text-black">
              log in
            </Link>
            .
          </p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-black/[0.06]" />

      {/* ── About ── */}
      <div className="py-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/40">
          About the author
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-black sm:text-3xl">
          Dr hab. n. med. Janusz Skrzypecki
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55">
          Ophthalmologist and eye surgeon with a clinical and academic background including training
          in New York (Columbia University), Manchester, and Heidelberg.
        </p>

        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-black/[0.08] bg-black/[0.04] sm:grid-cols-3">
          {[
            {
              title: 'Clinical focus',
              items: [
                'Cataract diagnosis and surgery',
                'Myopia control in children',
                'Dry eye, glaucoma, macular diseases',
              ],
            },
            {
              title: 'Research & education',
              items: [
                'International ophthalmology journals',
                'Evidence-based clinical training',
                'Polish Ophthalmological Society, AAO',
              ],
            },
            {
              title: 'Highlights',
              items: [
                'Top national specialization exam result',
                'Habilitation in medical sciences',
                'Warsaw Medical University — with honors',
              ],
            },
          ].map((col) => (
            <div key={col.title} className="bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/35">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2">
                {col.items.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-black/60">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" className="h-9 rounded-full px-4 text-sm text-black/50 hover:text-black">
            <Link href="https://skrzypecki.pl" target="_blank" rel="noopener noreferrer">
              skrzypecki.pl <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-9 rounded-full px-4 text-sm text-black/50 hover:text-black">
            <Link href="https://okulistykaakademicka.pl" target="_blank" rel="noopener noreferrer">
              okulistykaakademicka.pl <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-black/[0.06]" />

      {/* ── Content Formats ── */}
      <div className="py-12">
        <ContentFormats />
      </div>
    </section>
  )
}
