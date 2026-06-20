import { createFileRoute, Link } from '@tanstack/react-router'
import {
  PublicSiteFooter,
  PublicSiteHeader,
  PUBLIC_SITE_MAIN_COLUMN,
} from '@/features/jobs/public-site-layout'

const sections = [
  {
    title: 'Information we collect',
    body: [
      'When you create an account or sign in, we collect account details such as your name, email address, role type, and authentication provider details needed to keep your session secure.',
      'If you use candidate features, we may collect profile details, resume content, LinkedIn URL, phone number, saved jobs, and application activity that you choose to provide.',
      'If you use recruiter features, we may collect company details, job listings, payment status, moderation activity, and application pipeline activity.',
      'If you subscribe to updates, we collect your email address and email preference activity, including unsubscribe requests.',
    ],
  },
  {
    title: 'Google sign-in',
    body: [
      'If you choose to sign in with Google, Beonely receives basic profile information from Google, such as your name, email address, profile image, and Google account identifier.',
      'We use Google sign-in information only to create or access your Beonely account, personalize your account experience, prevent abuse, and maintain account security.',
      'We do not sell Google user data, and we do not use Google user data for advertising.',
    ],
  },
  {
    title: 'How we use information',
    body: [
      'We use information to operate Beonely, show relevant ServiceNow jobs, support applications, help recruiters manage listings, process paid listing workflows, send transactional messages, and improve reliability.',
      'We may use contact details to send product updates or job alerts when you subscribe or opt in. You can unsubscribe from marketing emails at any time.',
    ],
  },
  {
    title: 'Sharing and service providers',
    body: [
      'We share information with service providers that help us run Beonely, such as authentication, database hosting, email delivery, payments, analytics, deployment, and security services.',
      'Candidate application information may be shared with the recruiter or hiring team connected to the job you apply for.',
      'We may disclose information if required by law, to protect rights and safety, or to investigate fraud or abuse.',
    ],
  },
  {
    title: 'Data retention and choices',
    body: [
      'We keep information for as long as needed to provide Beonely, comply with legal obligations, resolve disputes, and maintain security records.',
      'You may request access, correction, or deletion of your personal information by contacting us. Some records may need to be retained for legal, security, payment, or operational reasons.',
    ],
  },
  {
    title: 'Security',
    body: [
      'We use reasonable technical and organizational safeguards to protect information. No online service can guarantee absolute security, so please use a strong password and keep your account access private.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'For privacy questions or requests, contact Nextgrid Digital at nextgrid.digital@gmail.com.',
    ],
  },
]

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
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
              Privacy Policy
            </p>
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
              Beonely Privacy Policy
            </h1>
            <p className='text-base text-muted-foreground sm:text-lg'>
              Last updated: June 21, 2026
            </p>
            <p className='text-sm leading-6 text-muted-foreground'>
              This Privacy Policy explains how Beonely, operated by Nextgrid
              Digital, collects, uses, and protects information when you use our
              ServiceNow-focused hiring platform.
            </p>
          </section>

          <section aria-label='Privacy policy sections' className='space-y-7'>
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
              to='/terms'
              className='font-medium text-foreground underline-offset-4 hover:underline'
            >
              Terms of Service
            </Link>
            .
          </p>
        </main>
      </div>
      <PublicSiteFooter />
    </div>
  )
}
