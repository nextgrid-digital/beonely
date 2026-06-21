import { ArrowRight, BriefcaseBusiness, CheckCircle2, UserPlus } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { HiringRequestForm } from '@/features/jobs/hiring-request-form'
import {
  PublicSiteFooter,
  PublicSiteHeader,
  PUBLIC_SITE_MAIN_COLUMN,
} from '@/features/jobs/public-site-layout'

export const Route = createFileRoute('/hire/')({
  component: HirePage,
})

function HirePage() {
  return (
    <div className='flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background'>
      <PublicSiteHeader />
      <div className='flex min-w-0 flex-1 flex-col pt-14'>
        <main
          id='main-content'
          className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-w-0 flex-1 flex-col gap-10 py-10 sm:py-12 md:gap-14 md:py-16`}
        >
          <section className='max-w-3xl space-y-5'>
            <p className='text-sm font-medium text-muted-foreground'>
              For partners, staffing teams, and internal recruiters
            </p>
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl'>
              Hire ServiceNow talent with less noise.
            </h1>
            <p className='max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg'>
              Beonely is building a focused hiring layer for the ServiceNow ecosystem.
              If you need developers, architects, consultants, or admins, start with a
              paid listing or submit a curated shortlist request.
            </p>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button asChild size='lg' className='min-w-[13rem]'>
                <a href='#hiring-request-form'>
                  Request a shortlist
                  <ArrowRight className='size-4' aria-hidden />
                </a>
              </Button>
              <Button asChild size='lg' variant='outline' className='min-w-[13rem]'>
                <Link to='/hire/sign-up'>
                  Create recruiter account
                  <UserPlus className='size-4' aria-hidden />
                </Link>
              </Button>
            </div>
          </section>

          <section className='grid gap-4 md:grid-cols-2'>
            <article className='rounded-2xl border bg-card p-6 shadow-sm'>
              <div className='mb-4 flex items-center gap-2 text-sm font-medium text-foreground'>
                <BriefcaseBusiness className='size-4' aria-hidden />
                Self-serve job posting
              </div>
              <h2 className='text-xl font-semibold tracking-tight'>
                Publish a paid ServiceNow role
              </h2>
              <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                Best for teams that already have a clear role description and want to get
                in front of focused ServiceNow talent.
              </p>
              <ul className='mt-5 space-y-3 text-sm text-muted-foreground'>
                <li className='flex gap-2'>
                  <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-foreground' aria-hidden />
                  Paid listing flow with recruiter workspace and moderation.
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-foreground' aria-hidden />
                  Built for ServiceNow-specific roles instead of generic hiring traffic.
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-foreground' aria-hidden />
                  Good fit when you want visibility and direct applicants.
                </li>
              </ul>
              <Button asChild className='mt-6 w-full sm:w-auto'>
                <Link to='/hire/sign-up'>
                  Start posting
                  <ArrowRight className='size-4' aria-hidden />
                </Link>
              </Button>
            </article>

            <article className='rounded-2xl border bg-card p-6 shadow-sm'>
              <div className='mb-4 flex items-center gap-2 text-sm font-medium text-foreground'>
                <ArrowRight className='size-4' aria-hidden />
                Concierge hiring
              </div>
              <h2 className='text-xl font-semibold tracking-tight'>
                Need candidates faster? Send a structured hiring brief.
              </h2>
              <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                Best for urgent or hard-to-fill roles where you want Beonely to help with
                sourcing and qualification instead of only listing the job.
              </p>
              <ul className='mt-5 space-y-3 text-sm text-muted-foreground'>
                <li className='flex gap-2'>
                  <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-foreground' aria-hidden />
                  Capture the role, hiring timeline, location, and ServiceNow scope.
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-foreground' aria-hidden />
                  Route demand into an internal pipeline instead of a generic inbox.
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-foreground' aria-hidden />
                  Use this when shortlist quality matters more than a posting alone.
                </li>
              </ul>
              <Button asChild variant='outline' className='mt-6 w-full sm:w-auto'>
                <a href='#hiring-request-form'>
                  Open hiring brief
                  <ArrowRight className='size-4' aria-hidden />
                </a>
              </Button>
            </article>
          </section>

          <section id='hiring-request-form'>
            <HiringRequestForm />
          </section>

          <section className='max-w-3xl rounded-2xl border bg-muted/40 p-6 sm:p-8'>
            <h2 className='text-xl font-semibold tracking-tight'>Why this exists</h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground sm:text-base'>
              Generic job boards create too much noise for ServiceNow hiring. Beonely is
              focused on the niche: role relevance, ecosystem context, and better matching
              between hiring teams and ServiceNow professionals.
            </p>
          </section>
        </main>
      </div>
      <PublicSiteFooter />
    </div>
  )
}
