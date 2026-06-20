import { createFileRoute, Link } from '@tanstack/react-router'
import {
  PublicSiteFooter,
  PublicSiteHeader,
  PUBLIC_SITE_MAIN_COLUMN,
} from '@/features/jobs/public-site-layout'

const sections = [
  {
    title: 'Using Beonely',
    body: [
      'Beonely is a niche hiring platform for ServiceNow roles. You may use Beonely only in compliance with these Terms, applicable law, and any product instructions shown in the service.',
      'You are responsible for keeping your account credentials secure and for activity that happens through your account.',
    ],
  },
  {
    title: 'Accounts and Google login',
    body: [
      'You may create an account with email-based authentication or supported third-party login providers such as Google.',
      'When you use Google login, you authorize Beonely to use the basic account information provided by Google to create, secure, and manage your Beonely account.',
    ],
  },
  {
    title: 'Candidates',
    body: [
      'Candidates are responsible for keeping profile, resume, contact, and application information accurate and lawful.',
      'When you apply to a recruiter-posted job through Beonely, you authorize us to share your application information with the relevant recruiter or hiring team.',
    ],
  },
  {
    title: 'Recruiters and job listings',
    body: [
      'Recruiters are responsible for ensuring job listings are accurate, lawful, non-discriminatory, and authorized by the hiring organization.',
      'Beonely may review, reject, remove, expire, or edit visibility of listings to protect platform quality, comply with law, prevent abuse, or enforce these Terms.',
    ],
  },
  {
    title: 'Payments',
    body: [
      'Paid listing features, pricing, duration, taxes, and renewal options are shown during checkout. Payment processing may be handled by third-party providers.',
      'Unless required by law or stated otherwise at checkout, paid listing fees are not automatically refundable once a listing has been submitted, reviewed, or published.',
    ],
  },
  {
    title: 'Acceptable use',
    body: [
      'You must not misuse Beonely, scrape or attack the service, upload malicious content, impersonate others, submit misleading information, infringe rights, or use the service for unlawful recruiting or spam.',
    ],
  },
  {
    title: 'Third-party links and job sources',
    body: [
      'Beonely may show links to third-party job pages, company websites, LinkedIn, payment providers, or authentication providers. We are not responsible for third-party content, availability, policies, or hiring decisions.',
    ],
  },
  {
    title: 'Service availability',
    body: [
      'We may update, suspend, or discontinue parts of Beonely at any time. We aim to keep the service useful and reliable, but we do not guarantee uninterrupted or error-free operation.',
    ],
  },
  {
    title: 'Disclaimers and liability',
    body: [
      'Beonely is provided on an as-is and as-available basis. We do not guarantee job availability, candidate quality, hiring outcomes, interview results, employment offers, or third-party platform behavior.',
      'To the fullest extent permitted by law, Beonely and Nextgrid Digital will not be liable for indirect, incidental, consequential, special, exemplary, or punitive damages.',
    ],
  },
  {
    title: 'Changes and contact',
    body: [
      'We may update these Terms from time to time. Continued use of Beonely after changes become effective means you accept the updated Terms.',
      'For questions about these Terms, contact Nextgrid Digital at nextgrid.digital@gmail.com.',
    ],
  },
]

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
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
              Terms of Service
            </p>
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
              Beonely Terms of Service
            </h1>
            <p className='text-base text-muted-foreground sm:text-lg'>
              Last updated: June 21, 2026
            </p>
            <p className='text-sm leading-6 text-muted-foreground'>
              These Terms govern your access to and use of Beonely, a
              ServiceNow-focused hiring platform operated by Nextgrid Digital.
            </p>
          </section>

          <section aria-label='Terms sections' className='space-y-7'>
            {sections.map((section) => (
              <article
                key={section.title}
                className='border-t border-border pt-6'
              >
                <h2 className='text-xl font-semibold tracking-tight'>
                  {section.title}
                </h2>
                <div className='mt-3 space-y-3 text-sm leading-6 text-muted-foreground'>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <p className='text-sm text-muted-foreground'>
            Please also review our{' '}
            <Link
              to='/privacy'
              className='font-medium text-foreground underline-offset-4 hover:underline'
            >
              Privacy Policy
            </Link>
            .
          </p>
        </main>
      </div>
      <PublicSiteFooter />
    </div>
  )
}
