import { createFileRoute } from '@tanstack/react-router'
import {
  PublicSiteFooter,
  PublicSiteHeader,
  PUBLIC_SITE_MAIN_COLUMN,
} from '@/features/jobs/public-site-layout'

type ChangelogEntry = {
  date: string
  title: string
  summary: string
  bullets: string[]
}

const changelogEntries: ChangelogEntry[] = [
  {
    date: 'June 2026',
    title: 'Public ServiceNow job discovery with filters',
    summary:
      'The public board now gives candidates a focused way to browse ServiceNow opportunities without sorting through generic roles.',
    bullets: [
      'Added a searchable public jobs experience for published listings.',
      'Introduced ServiceNow-focused filters for role type, work mode, experience, and location.',
      'Kept filter state in the URL so searches can be shared and revisited.',
    ],
  },
  {
    date: 'June 2026',
    title: 'Recruiter job posting, payment, and moderation flow',
    summary:
      'Recruiters can create job drafts, prepare listings, and submit them through the paid publishing workflow.',
    bullets: [
      'Added recruiter job creation and editing flows.',
      'Connected paid listing checkout through Razorpay.',
      'Added moderation states so listings can be reviewed before appearing publicly.',
    ],
  },
  {
    date: 'June 2026',
    title: 'Candidate, recruiter, and staff sign-in entry points',
    summary:
      'Each audience now has a clearer path into Beonely with role-aware sign-in and post-auth routing.',
    bullets: [
      'Added candidate entry points for job seekers applying to ServiceNow roles.',
      'Added recruiter entry points for hiring teams and partners.',
      'Added a staff sign-in path for admin review and operations workflows.',
    ],
  },
  {
    date: 'June 2026',
    title: 'LinkedIn roles section and newsletter updates',
    summary:
      'The public site now combines recruiter-posted roles with broader ServiceNow hiring signals and email updates.',
    bullets: [
      'Added a LinkedIn roles section for additional ServiceNow opportunities.',
      'Added newsletter signup for ServiceNow job updates.',
      'Added unsubscribe support for public email preferences.',
    ],
  },
]

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  return (
    <div className='flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background'>
      <PublicSiteHeader />
      <div className='flex min-w-0 flex-1 flex-col pt-14'>
        <main
          id='main-content'
          className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-w-0 flex-1 flex-col gap-10 py-10 sm:py-12 md:gap-12 md:py-16`}
        >
          <section className='max-w-2xl space-y-4'>
            <p className='text-sm font-medium text-muted-foreground'>
              Changelog
            </p>
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
              Beonely product updates
            </h1>
            <p className='text-base text-muted-foreground sm:text-lg'>
              A concise record of public-facing improvements to ServiceNow job
              discovery, recruiter workflows, and candidate experience.
            </p>
          </section>

          <section aria-label='Product updates' className='space-y-6'>
            {changelogEntries.map((entry) => (
              <article
                key={`${entry.date}-${entry.title}`}
                className='grid gap-4 border-t border-border pt-6 md:grid-cols-[9rem_1fr] md:gap-8'
              >
                <p className='text-sm font-medium text-muted-foreground'>
                  {entry.date}
                </p>
                <div className='min-w-0 space-y-3'>
                  <div className='space-y-2'>
                    <h2 className='text-xl font-semibold tracking-tight'>
                      {entry.title}
                    </h2>
                    <p className='text-sm leading-6 text-muted-foreground'>
                      {entry.summary}
                    </p>
                  </div>
                  <ul className='list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground'>
                    {entry.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
      <PublicSiteFooter />
    </div>
  )
}
