import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  UserPlus,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { currentPathWithSearch } from '@/lib/auth/redirect-path'
import { publicSiteOrigin } from '@/lib/site/site-origin'
import { Button } from '@/components/ui/button'
import { hiringRoleGuides } from '@/features/jobs/hiring-guides'
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
  const currentRedirect = currentPathWithSearch()
  const canonical = `${publicSiteOrigin()}/hire`
  const description =
    'Hire ServiceNow developers, architects, consultants, and admins through paid listings or a curated shortlist request on Beonely.'
  const ogImage = `${publicSiteOrigin()}/images/beonely-logo.svg`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Beonely ServiceNow hiring',
    serviceType: 'ServiceNow recruiting and shortlisting',
    provider: {
      '@type': 'Organization',
      name: 'Beonely',
      url: publicSiteOrigin(),
    },
    areaServed: 'Global',
    url: canonical,
    description,
  }

  return (
    <div className='flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background'>
      <Helmet>
        <title>Hire ServiceNow talent | Beonely</title>
        <meta name='description' content={description} />
        <link rel='canonical' href={canonical} />
        <meta property='og:title' content='Hire ServiceNow talent | Beonely' />
        <meta property='og:description' content={description} />
        <meta property='og:url' content={canonical} />
        <meta property='og:type' content='website' />
        <meta property='og:image' content={ogImage} />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content='Hire ServiceNow talent | Beonely' />
        <meta name='twitter:description' content={description} />
        <meta name='twitter:image' content={ogImage} />
      </Helmet>
      <script type='application/ld+json'>{JSON.stringify(jsonLd)}</script>
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
              Beonely is building a focused hiring layer for the ServiceNow
              ecosystem. If you need developers, architects, consultants, or
              admins, start with a paid listing or submit a curated shortlist
              request.
            </p>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button asChild size='lg' className='min-w-[13rem]'>
                <a href='#hiring-request-form'>
                  Request a shortlist
                  <ArrowRight className='size-4' aria-hidden />
                </a>
              </Button>
              <Button
                asChild
                size='lg'
                variant='outline'
                className='min-w-[13rem]'
              >
                <Link
                  to='/hire/sign-up'
                  search={currentRedirect ? { redirect: currentRedirect } : {}}
                >
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
                Best for teams that already have a clear role description and
                want to get in front of focused ServiceNow talent.
              </p>
              <ul className='mt-5 space-y-3 text-sm text-muted-foreground'>
                <li className='flex gap-2'>
                  <CheckCircle2
                    className='mt-0.5 size-4 shrink-0 text-foreground'
                    aria-hidden
                  />
                  Paid listing flow with recruiter workspace and moderation.
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2
                    className='mt-0.5 size-4 shrink-0 text-foreground'
                    aria-hidden
                  />
                  Built for ServiceNow-specific roles instead of generic hiring
                  traffic.
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2
                    className='mt-0.5 size-4 shrink-0 text-foreground'
                    aria-hidden
                  />
                  Good fit when you want visibility and direct applicants.
                </li>
              </ul>
              <Button asChild className='mt-6 w-full sm:w-auto'>
                <Link
                  to='/hire/sign-up'
                  search={currentRedirect ? { redirect: currentRedirect } : {}}
                >
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
                Best for urgent or hard-to-fill roles where you want Beonely to
                help with sourcing and qualification instead of only listing the
                job.
              </p>
              <ul className='mt-5 space-y-3 text-sm text-muted-foreground'>
                <li className='flex gap-2'>
                  <CheckCircle2
                    className='mt-0.5 size-4 shrink-0 text-foreground'
                    aria-hidden
                  />
                  Capture the role, hiring timeline, location, and ServiceNow
                  scope.
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2
                    className='mt-0.5 size-4 shrink-0 text-foreground'
                    aria-hidden
                  />
                  Route demand into an internal pipeline instead of a generic
                  inbox.
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2
                    className='mt-0.5 size-4 shrink-0 text-foreground'
                    aria-hidden
                  />
                  Use this when shortlist quality matters more than a posting
                  alone.
                </li>
              </ul>
              <Button
                asChild
                variant='outline'
                className='mt-6 w-full sm:w-auto'
              >
                <a href='#hiring-request-form'>
                  Open hiring brief
                  <ArrowRight className='size-4' aria-hidden />
                </a>
              </Button>
            </article>
          </section>

          <section className='rounded-2xl border bg-muted/40 p-6 sm:p-8'>
            <div className='flex flex-col gap-6 md:flex-row md:items-end md:justify-between'>
              <div className='max-w-2xl'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Employer-intent pages
                </p>
                <h2 className='mt-2 text-2xl font-semibold tracking-tight'>
                  Explore role-specific ServiceNow hiring paths
                </h2>
                <p className='mt-3 text-sm leading-6 text-muted-foreground sm:text-base'>
                  These pages are built for employer-intent search and
                  answer-engine traffic, so hiring teams can land on a narrower
                  path before they post or request a shortlist.
                </p>
              </div>
              <Button asChild variant='outline'>
                <Link to='/hire/faq'>Read the ServiceNow hiring FAQ</Link>
              </Button>
            </div>
            <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              {hiringRoleGuides.map((guide) => (
                <Link
                  key={guide.path}
                  to={guide.path}
                  className='rounded-2xl border bg-background p-5 text-sm transition hover:border-foreground/30 hover:shadow-sm'
                >
                  <div className='font-semibold text-foreground'>
                    {guide.title}
                  </div>
                  <p className='mt-2 line-clamp-3 leading-6 text-muted-foreground'>
                    {guide.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section id='hiring-request-form'>
            <HiringRequestForm />
          </section>

          <section className='max-w-3xl rounded-2xl border bg-muted/40 p-6 sm:p-8'>
            <h2 className='text-xl font-semibold tracking-tight'>
              Why this exists
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground sm:text-base'>
              Generic job boards create too much noise for ServiceNow hiring.
              Beonely is focused on the niche: role relevance, ecosystem
              context, and better matching between hiring teams and ServiceNow
              professionals.
            </p>
          </section>
        </main>
      </div>
      <PublicSiteFooter />
    </div>
  )
}
