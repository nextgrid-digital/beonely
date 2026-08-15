import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { publicSiteOrigin } from '@/lib/site/site-origin'
import { Button } from '@/components/ui/button'
import {
  PUBLIC_SITE_BREADCRUMB_LINK,
  PUBLIC_SITE_BREADCRUMB_LIST,
  PublicSiteFooter,
  PublicSiteHeader,
  PublicSiteStickySubheader,
  PUBLIC_SITE_MAIN_COLUMN,
} from '@/features/jobs/public-site-layout'

export type HiringGuideFaq = {
  question: string
  answer: string
}

export type HiringRoleGuide = {
  path: string
  shortLabel: string
  title: string
  metaTitle: string
  description: string
  intro: string
  painPoints: string[]
  screeningSignals: string[]
  engagementOptions: string[]
  faqs: HiringGuideFaq[]
}

export const hiringRoleGuides: HiringRoleGuide[] = [
  {
    path: '/hire/contract-servicenow-talent',
    shortLabel: 'Contract talent',
    title: 'Hire contract ServiceNow talent',
    metaTitle: 'Hire contract ServiceNow talent | Beonely',
    description:
      'Hire contract ServiceNow talent for implementation surges, remediation work, urgent backfills, specialist delivery gaps, and shorter-term platform support.',
    intro:
      'Use this path when time-to-start matters more than building a full permanent-hire process, or when the workload is tied to a delivery window, backlog spike, or specialist initiative.',
    painPoints: [
      'A ServiceNow implementation or remediation project needs extra delivery capacity quickly.',
      'The work is real and urgent, but not yet stable enough to justify a permanent full-time hire.',
      'You need narrower platform talent than a generic contract recruiter usually understands.',
    ],
    screeningSignals: [
      'Evidence of shipping inside live ServiceNow environments with short onboarding curves.',
      'Clarity on how the person handles delivery pace, handoff quality, and defined-scope work.',
      'Ability to contribute quickly without requiring weeks of platform acclimation.',
    ],
    engagementOptions: [
      'Use a shortlist request when the contract need is urgent, specialist, or difficult to scope quickly.',
      'Use a paid listing when you already know the duration, scope, rate context, and ownership model.',
      'Keep the brief explicit about start timing, delivery phase, and expected platform depth so contract intent stays qualified.',
    ],
    faqs: [
      {
        question:
          'When should I hire contract ServiceNow talent instead of making a permanent hire?',
        answer:
          'Choose contract talent when the work is tied to a defined implementation phase, urgent backlog, platform remediation, or temporary spike in delivery demand. If the long-term need is still unclear, contract hiring can reduce time-to-start and decision friction.',
      },
      {
        question: 'What should I include in a contract ServiceNow brief?',
        answer:
          'Be clear about the project phase, expected duration, scope of work, desired start date, role depth, and whether the contractor is expected to ship independently or alongside an internal team.',
      },
      {
        question:
          'Can contract ServiceNow talent work for architecture or consulting roles too?',
        answer:
          'Yes. Contract hiring is not limited to developers. It can work for architects, consultants, admins, or mixed platform specialists when the engagement has a clear delivery window or a specific recovery objective.',
      },
    ],
  },
  {
    path: '/hire/remote-servicenow-talent',
    shortLabel: 'Remote talent',
    title: 'Hire remote ServiceNow talent',
    metaTitle: 'Hire remote ServiceNow talent | Beonely',
    description:
      'Hire remote ServiceNow talent across developers, architects, consultants, and admins when you need broader access to niche platform capability beyond local hiring constraints.',
    intro:
      'Use this path when the local candidate pool is too narrow, the role is too specialized for one geography, or the hiring goal is speed and niche-fit over strict office proximity.',
    painPoints: [
      'Local hiring markets are too small for the ServiceNow skill mix you need.',
      'Open roles are stalling because geography is filtering out otherwise strong candidates.',
      'You need specialized ServiceNow capability quickly and are willing to hire across regions or time zones.',
    ],
    screeningSignals: [
      'Evidence of strong async communication, stakeholder clarity, and remote delivery discipline.',
      'Ability to work effectively across documentation, handoffs, and distributed implementation teams.',
      'Proof of real ServiceNow platform depth beyond generic remote-work polish.',
    ],
    engagementOptions: [
      'Use a shortlist request when remote constraints, overlap requirements, or role nuance need interpretation before you recruit broadly.',
      'Use a paid listing when the remote policy, timezone range, and role scope are already crisp.',
      'Be explicit about timezone expectations, collaboration model, and whether the role is fully remote or remote-first with specific overlap windows.',
    ],
    faqs: [
      {
        question: 'Is remote hiring practical for ServiceNow roles?',
        answer:
          'Often yes, especially for platform delivery, consulting, architecture, and admin work where documentation, stakeholder coordination, and implementation discipline are strong. The main requirement is clarity on collaboration and overlap expectations.',
      },
      {
        question:
          'What should I screen for when hiring remote ServiceNow talent?',
        answer:
          'Screen for both ServiceNow depth and remote execution habits: documentation quality, async communication, handoff reliability, stakeholder management, and the ability to work without constant in-person escalation.',
      },
      {
        question: 'How do I write a better remote ServiceNow job brief?',
        answer:
          'Specify the timezone range, working overlap, employment model, role scope, team context, and how the person will collaborate with delivery or business stakeholders. Vague remote policies usually attract noisier inbound.',
      },
    ],
  },
  {
    path: '/hire/servicenow-developers',
    shortLabel: 'Developers',
    title: 'Hire ServiceNow developers',
    metaTitle: 'Hire ServiceNow developers | Beonely',
    description:
      'Find and hire ServiceNow developers for scoped builds, platform delivery, workflow automation, integrations, and ongoing implementation support.',
    intro:
      'Use this path when you need people who can build, extend, and ship inside ServiceNow—not just describe the platform at a high level.',
    painPoints: [
      'Building or cleaning up scoped applications, catalog flows, automations, and custom business logic.',
      'Supporting active implementations where backlog volume is outrunning internal delivery capacity.',
      'Needing developers who can work with architects, admins, QA, and stakeholders without getting lost in generic engineering recruiting noise.',
    ],
    screeningSignals: [
      'Hands-on experience with ServiceNow development patterns, scripting, and platform customization.',
      'Evidence of shipping workflows, forms, integrations, catalog items, or internal tooling inside real ServiceNow environments.',
      'Comfort translating ambiguous requirements into platform changes without creating long-term maintenance debt.',
    ],
    engagementOptions: [
      'Use a paid listing when you already have a clean role brief and want direct inbound applicants.',
      'Use a shortlist request when the role is urgent, niche, or hard to scope and you want manual support on qualification.',
      'Start with contract or project-based support if the workload is tied to a rollout, migration, backlog burn-down, or temporary delivery spike.',
    ],
    faqs: [
      {
        question:
          'When should I hire a ServiceNow developer instead of a consultant?',
        answer:
          'Choose a developer when the main need is execution inside the platform: building workflows, forms, catalog items, scripts, integrations, and backlog delivery. Choose a consultant when the need is broader process design, stakeholder alignment, and operating-model guidance.',
      },
      {
        question: 'What should I screen for in a ServiceNow developer?',
        answer:
          'Screen for shipped platform work, clarity on implementation tradeoffs, and the ability to explain how they handled real ServiceNow constraints. Generic JavaScript experience alone is not enough.',
      },
      {
        question: 'Is contract hiring a good option for ServiceNow developers?',
        answer:
          'Yes, especially when the work is tied to a defined implementation phase, backlog cleanup, or specialist platform delivery need. Contracting can reduce time-to-start when the scope is already clear.',
      },
    ],
  },
  {
    path: '/hire/servicenow-architects',
    shortLabel: 'Architects',
    title: 'Hire ServiceNow architects',
    metaTitle: 'Hire ServiceNow architects | Beonely',
    description:
      'Hire ServiceNow architects for platform design, implementation structure, governance, multi-workstream planning, and long-term platform decisions.',
    intro:
      'Use this path when the problem is not just delivery capacity—it is platform direction, solution quality, or avoiding expensive implementation mistakes.',
    painPoints: [
      'Designing platform structure across modules, stakeholders, and longer implementation timelines.',
      'Making decisions about scope, governance, integration boundaries, or how to sequence a larger ServiceNow program.',
      'Needing someone who can balance delivery speed with maintainability and platform coherence.',
    ],
    screeningSignals: [
      'Experience designing ServiceNow implementations across multiple workstreams, teams, or business units.',
      'Clear reasoning about platform tradeoffs, governance, extensibility, and technical debt.',
      'Ability to communicate with both delivery teams and non-technical stakeholders without losing precision.',
    ],
    engagementOptions: [
      'Use a shortlist request when the role touches architecture, governance, or high-stakes program decisions.',
      'Use a paid listing if you already know the scope, seniority, and ownership boundaries of the architect role.',
      'Consider fractional or contract architecture support when the need is concentrated around design, rollout planning, or remediation work.',
    ],
    faqs: [
      {
        question: 'When do I need a ServiceNow architect?',
        answer:
          'Bring in an architect when platform decisions affect multiple teams, modules, or long-term maintainability. If the biggest risk is poor structure or design drift, architecture capability matters early.',
      },
      {
        question: 'How is a ServiceNow architect different from a developer?',
        answer:
          'Developers are typically closer to execution and building inside the platform. Architects focus more on system design, delivery structure, governance, technical direction, and how choices scale over time.',
      },
      {
        question: 'Can I hire a ServiceNow architect on contract?',
        answer:
          'Yes. Contract or fractional architecture support is common when the need is concentrated around solution design, implementation review, recovery work, or a specific rollout phase.',
      },
    ],
  },
  {
    path: '/hire/servicenow-consultants',
    shortLabel: 'Consultants',
    title: 'Hire ServiceNow consultants',
    metaTitle: 'Hire ServiceNow consultants | Beonely',
    description:
      'Hire ServiceNow consultants for discovery, process design, implementation guidance, stakeholder alignment, and platform rollout support.',
    intro:
      'Use this path when the challenge sits between business process and platform delivery, and you need someone who can translate operational needs into workable ServiceNow decisions.',
    painPoints: [
      'Discovery work is incomplete and requirements are still moving across stakeholders.',
      'You need someone who can shape process, documentation, and rollout decisions alongside implementation teams.',
      'Hiring signals are muddy because the role spans analysis, delivery coordination, and platform fluency.',
    ],
    screeningSignals: [
      'Ability to lead discovery, requirements gathering, and process mapping in ServiceNow contexts.',
      'Evidence of translating stakeholder goals into implementation-ready decisions rather than staying at slideware level.',
      'Comfort working across operations, delivery, and change-management conversations.',
    ],
    engagementOptions: [
      'Use a shortlist request when the problem is messy and the role needs interpretation before recruiting can move fast.',
      'Use a paid listing when the role brief is already mature and clearly scoped.',
      'Use contract consulting support for discovery, transformation phases, or temporary implementation orchestration.',
    ],
    faqs: [
      {
        question: 'What does a ServiceNow consultant usually own?',
        answer:
          'Consultants often sit at the intersection of discovery, process design, stakeholder coordination, implementation guidance, and rollout planning. The exact mix depends on the maturity of the program and the team around them.',
      },
      {
        question: 'Should I hire a consultant or an architect first?',
        answer:
          'If the main gap is discovery and requirements clarity, a consultant is often the better first hire. If the main gap is platform design and long-term structure, an architect may be the better first move.',
      },
      {
        question: 'Can ServiceNow consultants be hired for short-term work?',
        answer:
          'Yes. Short-term or phase-specific consulting support can work well for discovery, process design, rollout planning, remediation, and stakeholder alignment before or during a broader implementation.',
      },
    ],
  },
  {
    path: '/hire/servicenow-admins',
    shortLabel: 'Admins',
    title: 'Hire ServiceNow admins',
    metaTitle: 'Hire ServiceNow admins | Beonely',
    description:
      'Hire ServiceNow admins for platform operations, user support, configuration upkeep, data hygiene, and day-to-day workflow reliability.',
    intro:
      'Use this path when your ServiceNow environment is live and the bottleneck is steady operational care, user support, or keeping the platform clean and responsive.',
    painPoints: [
      'Day-to-day admin work is slowing down internal teams or falling between delivery and support responsibilities.',
      'The platform needs better upkeep around users, requests, workflows, and operational consistency.',
      'You need someone who can keep a live ServiceNow environment organized without treating it like a one-time project.',
    ],
    screeningSignals: [
      'Experience maintaining ServiceNow environments, user flows, requests, and operational platform hygiene.',
      'Comfort working with service teams, business users, and internal stakeholders on recurring platform needs.',
      'Evidence of reliability, responsiveness, and attention to process detail—not only one-off build work.',
    ],
    engagementOptions: [
      'Use a paid listing when the admin role is clear, recurring, and ready for direct recruitment.',
      'Use a shortlist request when the role blends admin work with support, reporting, coordination, or cross-functional operations.',
      'Consider contract admin support when the workload is temporary, tied to a transition, or aimed at stabilizing an already-live platform.',
    ],
    faqs: [
      {
        question:
          'What is the difference between a ServiceNow admin and a developer?',
        answer:
          'Admins usually focus more on platform operations, user support, configuration upkeep, and day-to-day reliability. Developers are usually closer to building custom logic, deeper platform changes, and implementation delivery.',
      },
      {
        question: 'When should I hire a ServiceNow admin?',
        answer:
          'Hire an admin when the platform is active and the operational load around users, requests, configurations, and recurring support is becoming a bottleneck.',
      },
      {
        question: 'Can a ServiceNow admin also support implementation work?',
        answer:
          'Sometimes, yes—but it depends on depth. Some admins can support lighter implementation tasks, while more complex build work may still require a developer or architect alongside them.',
      },
    ],
  },
]

const roleGuideMap = new Map(
  hiringRoleGuides.map((guide) => [guide.path, guide])
)

function guideByPath(path: string) {
  const guide = roleGuideMap.get(path)
  if (!guide) throw new Error(`Missing hiring guide for path: ${path}`)
  return guide
}

function HiringGuideBreadcrumb({ currentLabel }: { currentLabel: string }) {
  return (
    <ol className={PUBLIC_SITE_BREADCRUMB_LIST}>
      <li className='inline-flex items-center gap-2'>
        <Link to='/' className={PUBLIC_SITE_BREADCRUMB_LINK}>
          Home
        </Link>
        <ChevronRight className='size-4 shrink-0 opacity-60' aria-hidden />
      </li>
      <li className='inline-flex items-center gap-2'>
        <Link to='/hire' className={PUBLIC_SITE_BREADCRUMB_LINK}>
          Hire talent
        </Link>
        <ChevronRight className='size-4 shrink-0 opacity-60' aria-hidden />
      </li>
      <li className='min-w-0 font-medium text-stone-800' aria-current='page'>
        <span className='block truncate'>{currentLabel}</span>
      </li>
    </ol>
  )
}

function HiringGuideShell({
  title,
  description,
  canonical,
  ogImage,
  breadcrumbLabel,
  children,
}: {
  title: string
  description: string
  canonical: string
  ogImage: string
  breadcrumbLabel: string
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background'>
      <Helmet>
        <title>{title}</title>
        <meta name='description' content={description} />
        <link rel='canonical' href={canonical} />
        <meta property='og:title' content={title} />
        <meta property='og:description' content={description} />
        <meta property='og:url' content={canonical} />
        <meta property='og:type' content='website' />
        <meta property='og:image' content={ogImage} />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content={title} />
        <meta name='twitter:description' content={description} />
        <meta name='twitter:image' content={ogImage} />
      </Helmet>
      <PublicSiteHeader />
      <div className='flex min-w-0 flex-1 flex-col pt-14'>
        <main
          id='main-content'
          className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-w-0 flex-1 flex-col pb-12`}
        >
          <div className='w-full pt-2'>
            <PublicSiteStickySubheader
              breadcrumb={
                <HiringGuideBreadcrumb currentLabel={breadcrumbLabel} />
              }
            />
            {children}
          </div>
        </main>
      </div>
      <PublicSiteFooter />
    </div>
  )
}

export function HiringRoleGuidePage({ path }: { path: string }) {
  const guide = guideByPath(path)
  const siteOrigin = publicSiteOrigin()
  const canonical = `${siteOrigin}${guide.path}`
  const ogImage = `${siteOrigin}/images/beonely-logo.svg`
  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: guide.title,
    serviceType: guide.title,
    provider: {
      '@type': 'Organization',
      name: 'Beonely',
      url: siteOrigin,
    },
    areaServed: 'Global',
    url: canonical,
    description: guide.description,
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
  const relatedGuides = hiringRoleGuides.filter((entry) => entry.path !== path)

  return (
    <>
      <script type='application/ld+json'>
        {JSON.stringify(serviceJsonLd)}
      </script>
      <script type='application/ld+json'>{JSON.stringify(faqJsonLd)}</script>
      <HiringGuideShell
        title={guide.metaTitle}
        description={guide.description}
        canonical={canonical}
        ogImage={ogImage}
        breadcrumbLabel={guide.shortLabel}
      >
        <div className='mx-auto max-w-4xl space-y-10 pt-4 pb-16 sm:pt-6'>
          <section className='space-y-5'>
            <p className='text-sm font-medium text-muted-foreground'>
              Employer intent page
            </p>
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl'>
              {guide.title}
            </h1>
            <p className='max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg'>
              {guide.description}
            </p>
            <p className='max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base'>
              {guide.intro}
            </p>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button asChild size='lg' className='min-w-[13rem]'>
                <Link to='/hire' hash='hiring-request-form'>
                  Request a shortlist
                  <ArrowRight className='size-4' aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size='lg'
                variant='outline'
                className='min-w-[13rem]'
              >
                <Link to='/hire/sign-up' search={{ redirect: guide.path }}>
                  Create recruiter account
                  <ArrowRight className='size-4' aria-hidden />
                </Link>
              </Button>
            </div>
          </section>

          <section className='grid gap-4 md:grid-cols-3'>
            <article className='rounded-2xl border bg-card p-6 shadow-sm md:col-span-2'>
              <h2 className='text-xl font-semibold tracking-tight'>
                When this page is the right fit
              </h2>
              <ul className='mt-4 space-y-3 text-sm leading-6 text-muted-foreground'>
                {guide.painPoints.map((item) => (
                  <li key={item} className='flex gap-2'>
                    <CheckCircle2
                      className='mt-0.5 size-4 shrink-0 text-foreground'
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className='rounded-2xl border bg-muted/40 p-6'>
              <h2 className='text-xl font-semibold tracking-tight'>
                Next step
              </h2>
              <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                If the role is urgent, difficult to scope, or too niche for a
                generic board, use the shortlist request so buyer intent goes
                into Beonely&apos;s hiring workflow instead of disappearing into
                generic traffic.
              </p>
              <Button asChild className='mt-6 w-full sm:w-auto'>
                <Link to='/hire' hash='hiring-request-form'>
                  Open hiring brief
                </Link>
              </Button>
            </article>
          </section>

          <section className='grid gap-4 md:grid-cols-2'>
            <article className='rounded-2xl border bg-card p-6 shadow-sm'>
              <h2 className='text-xl font-semibold tracking-tight'>
                What to screen for
              </h2>
              <ul className='mt-4 space-y-3 text-sm leading-6 text-muted-foreground'>
                {guide.screeningSignals.map((item) => (
                  <li key={item} className='flex gap-2'>
                    <CheckCircle2
                      className='mt-0.5 size-4 shrink-0 text-foreground'
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className='rounded-2xl border bg-card p-6 shadow-sm'>
              <h2 className='text-xl font-semibold tracking-tight'>
                How to engage
              </h2>
              <ul className='mt-4 space-y-3 text-sm leading-6 text-muted-foreground'>
                {guide.engagementOptions.map((item) => (
                  <li key={item} className='flex gap-2'>
                    <CheckCircle2
                      className='mt-0.5 size-4 shrink-0 text-foreground'
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className='rounded-2xl border bg-card p-6 shadow-sm sm:p-8'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium text-muted-foreground'>
                Answer engine content
              </p>
              <h2 className='mt-2 text-2xl font-semibold tracking-tight'>
                Common questions about {guide.title.toLowerCase()}
              </h2>
            </div>
            <div className='mt-6 space-y-4'>
              {guide.faqs.map((faq) => (
                <article key={faq.question} className='rounded-xl border p-5'>
                  <h3 className='text-base font-semibold tracking-tight'>
                    {faq.question}
                  </h3>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className='rounded-2xl border bg-muted/40 p-6 sm:p-8'>
            <div className='flex flex-col gap-6 md:flex-row md:items-end md:justify-between'>
              <div className='max-w-2xl'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Related hiring pages
                </p>
                <h2 className='mt-2 text-2xl font-semibold tracking-tight'>
                  Explore other ServiceNow hiring paths
                </h2>
              </div>
              <Button asChild variant='outline'>
                <Link to='/hire/faq'>Read the ServiceNow hiring FAQ</Link>
              </Button>
            </div>
            <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              {relatedGuides.map((entry) => (
                <Link
                  key={entry.path}
                  to={entry.path}
                  className='rounded-2xl border bg-background p-5 text-sm transition hover:border-foreground/30 hover:shadow-sm'
                >
                  <div className='font-semibold text-foreground'>
                    {entry.title}
                  </div>
                  <p className='mt-2 line-clamp-3 leading-6 text-muted-foreground'>
                    {entry.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </HiringGuideShell>
    </>
  )
}

const hiringFaqs: HiringGuideFaq[] = [
  {
    question:
      'How do I hire ServiceNow talent without using a generic job board?',
    answer:
      'Start with a role-specific brief, stay explicit about the ServiceNow scope, and use channels or pages built around ServiceNow intent rather than broad hiring traffic. On Beonely, that means either posting a focused paid role or sending a shortlist request through the hiring brief.',
  },
  {
    question: 'When should I use a shortlist request instead of a job post?',
    answer:
      'Use a shortlist request when the role is urgent, hard to scope, senior, or niche enough that qualification matters more than raw applicant volume. It is also the better path when internal stakeholders still need help shaping the brief.',
  },
  {
    question: 'What ServiceNow roles should be separated in hiring?',
    answer:
      'At minimum, separate developers, architects, consultants, and admins because the work, screening signals, and delivery responsibilities differ. Lumping them together usually creates weak briefs and slow qualification.',
  },
  {
    question: 'Is contract hiring useful for ServiceNow roles?',
    answer:
      'Often yes. Contract support can work well for implementations, specialist remediation, rollout phases, architecture review, or temporary delivery spikes where time-to-start matters more than a permanent hire.',
  },
  {
    question: 'What should I include in a ServiceNow hiring brief?',
    answer:
      'Be explicit about role type, seniority, platform scope, timeline, location constraints, team context, and whether the need is direct delivery, architecture, consulting, or ongoing admin support. Specificity improves qualification speed.',
  },
  {
    question: 'How can I reduce noise in ServiceNow recruiting?',
    answer:
      'Use narrower role definitions, ask for evidence of real ServiceNow work, separate role categories clearly, and route demand through focused pages and workflows instead of relying only on generic inbound traffic.',
  },
]

export function HiringFaqPage() {
  const siteOrigin = publicSiteOrigin()
  const canonical = `${siteOrigin}/hire/faq`
  const ogImage = `${siteOrigin}/images/beonely-logo.svg`
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: hiringFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script type='application/ld+json'>{JSON.stringify(faqJsonLd)}</script>
      <HiringGuideShell
        title='ServiceNow hiring FAQ | Beonely'
        description='Answers to common ServiceNow hiring questions around roles, shortlist requests, job posts, contract hiring, and reducing recruiting noise.'
        canonical={canonical}
        ogImage={ogImage}
        breadcrumbLabel='FAQ'
      >
        <div className='mx-auto max-w-4xl space-y-10 pt-4 pb-16 sm:pt-6'>
          <section className='space-y-5'>
            <p className='text-sm font-medium text-muted-foreground'>
              Answer engine page
            </p>
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl'>
              ServiceNow hiring FAQ
            </h1>
            <p className='max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg'>
              Straight answers to common questions about hiring ServiceNow
              developers, architects, consultants, and admins.
            </p>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button asChild size='lg' className='min-w-[13rem]'>
                <Link to='/hire' hash='hiring-request-form'>
                  Request a shortlist
                  <ArrowRight className='size-4' aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size='lg'
                variant='outline'
                className='min-w-[13rem]'
              >
                <Link to='/hire/sign-up' search={{ redirect: '/hire/faq' }}>
                  Create recruiter account
                  <ArrowRight className='size-4' aria-hidden />
                </Link>
              </Button>
            </div>
          </section>

          <section className='rounded-2xl border bg-card p-6 shadow-sm sm:p-8'>
            <div className='space-y-4'>
              {hiringFaqs.map((faq) => (
                <article key={faq.question} className='rounded-xl border p-5'>
                  <h2 className='text-lg font-semibold tracking-tight'>
                    {faq.question}
                  </h2>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className='rounded-2xl border bg-muted/40 p-6 sm:p-8'>
            <div className='max-w-2xl'>
              <p className='text-sm font-medium text-muted-foreground'>
                Role-specific pages
              </p>
              <h2 className='mt-2 text-2xl font-semibold tracking-tight'>
                Continue into employer-intent landing pages
              </h2>
            </div>
            <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              {hiringRoleGuides.map((entry) => (
                <Link
                  key={entry.path}
                  to={entry.path}
                  className='rounded-2xl border bg-background p-5 text-sm transition hover:border-foreground/30 hover:shadow-sm'
                >
                  <div className='font-semibold text-foreground'>
                    {entry.title}
                  </div>
                  <p className='mt-2 line-clamp-3 leading-6 text-muted-foreground'>
                    {entry.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </HiringGuideShell>
    </>
  )
}
