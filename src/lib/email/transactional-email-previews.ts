import {
  beonelyTransactionalHtml,
  transactionalEmailSiteOrigin,
} from '@/lib/email/beonely-transactional-html'

export type TransactionalEmailPreview = {
  id: string
  label: string
  subject: string
  html: string
}

/** Sample transactional templates for admin read-only previews (no API). */
export function getTransactionalEmailPreviews(): TransactionalEmailPreview[] {
  const origin = transactionalEmailSiteOrigin()
  const jobTitle = 'Senior ServiceNow Developer'
  const companyName = 'Acme Corp'
  const jobSlug = 'senior-servicenow-developer-acme'

  return [
    {
      id: 'candidateSignup',
      label: 'Candidate signup',
      subject: 'Welcome to Beonely',
      html: beonelyTransactionalHtml({
        headline: 'Welcome to Beonely',
        bodyParagraphs: [
          'Your candidate profile is ready. Complete your resume and start applying to ServiceNow roles.',
          `Open your dashboard: ${origin}/candidate/profile`,
        ],
      }),
    },
    {
      id: 'recruiterSignup',
      label: 'Recruiter signup',
      subject: 'Welcome to Beonely for recruiters',
      html: beonelyTransactionalHtml({
        headline: 'Welcome to Beonely',
        bodyParagraphs: [
          `Your recruiter account for ${companyName} is set up.`,
          `Post your first job: ${origin}/recruiter`,
        ],
      }),
    },
    {
      id: 'jobSubmitted',
      label: 'Job submitted (recruiter)',
      subject: `Beonely — "${jobTitle}" submitted for review`,
      html: beonelyTransactionalHtml({
        headline: 'Listing submitted',
        bodyParagraphs: [
          `${jobTitle} at ${companyName} was submitted for review.`,
          'We will email you when it is approved and live on the job board.',
        ],
      }),
    },
    {
      id: 'jobApproved',
      label: 'Job approved (recruiter)',
      subject: `Beonely — "${jobTitle}" is live`,
      html: beonelyTransactionalHtml({
        headline: 'Your listing is approved',
        bodyParagraphs: [
          `Good news — ${jobTitle} at ${companyName} is now live on Beonely.`,
          `View the public job page: ${origin}/jobs/${jobSlug}`,
          'Share the link with candidates or manage the listing from your recruiter dashboard.',
        ],
      }),
    },
    {
      id: 'jobRejected',
      label: 'Job rejected (recruiter)',
      subject: `Beonely — update on "${jobTitle}"`,
      html: beonelyTransactionalHtml({
        headline: 'Listing not approved',
        bodyParagraphs: [
          `We could not approve ${jobTitle} at ${companyName} for the public job board.`,
          'Reason: Please add more detail about required modules.',
          'You can edit the listing and contact support if you have questions.',
        ],
      }),
    },
    {
      id: 'applicationReceived',
      label: 'Application received (recruiter)',
      subject: `New application — ${jobTitle}`,
      html: beonelyTransactionalHtml({
        headline: 'New candidate application',
        bodyParagraphs: [
          `Alex Candidate applied to ${jobTitle} on Beonely.`,
          `Review applications in your recruiter dashboard: ${origin}/recruiter`,
        ],
      }),
    },
    {
      id: 'applicationConfirmation',
      label: 'Application confirmation (candidate)',
      subject: `Application sent — ${jobTitle}`,
      html: beonelyTransactionalHtml({
        headline: 'Application submitted',
        bodyParagraphs: [
          `Your application to ${jobTitle} at ${companyName} was submitted successfully.`,
          'The hiring team will review your profile on Beonely. You can track applications from your candidate dashboard.',
        ],
      }),
    },
  ]
}
