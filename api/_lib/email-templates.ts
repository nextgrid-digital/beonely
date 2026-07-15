import { beonelyTransactionalHtml } from './email-layout.js'
import { beonelyMarketingHtml } from './email-marketing-layout.js'
import { serverSiteOrigin } from './site-origin.js'

export function jobApprovedRecruiterEmail(opts: {
  jobTitle: string
  companyName: string
  jobSlug: string
}) {
  const url = `${serverSiteOrigin()}/jobs/${opts.jobSlug}`
  return {
    subject: `Beonely — "${opts.jobTitle}" is live`,
    html: beonelyTransactionalHtml({
      headline: 'Your listing is approved',
      bodyParagraphs: [
        `Good news — ${opts.jobTitle} at ${opts.companyName} is now live on Beonely.`,
        `View the public job page: ${url}`,
        'Share the link with candidates or manage the listing from your recruiter dashboard.',
      ],
    }),
  }
}

export function jobRejectedRecruiterEmail(opts: {
  jobTitle: string
  companyName: string
  reason?: string | null
}) {
  const reason = opts.reason?.trim()
  return {
    subject: `Beonely — update on "${opts.jobTitle}"`,
    html: beonelyTransactionalHtml({
      headline: 'Listing not approved',
      bodyParagraphs: [
        `We could not approve ${opts.jobTitle} at ${opts.companyName} for the public job board.`,
        ...(reason ? [`Reason: ${reason}`] : []),
        'You can edit the listing and contact support if you have questions.',
      ],
    }),
  }
}

export function applicationReceivedRecruiterEmail(opts: {
  jobTitle: string
  candidateName: string
  recruiterPortalUrl: string
}) {
  return {
    subject: `New application — ${opts.jobTitle}`,
    html: beonelyTransactionalHtml({
      headline: 'New candidate application',
      bodyParagraphs: [
        `${opts.candidateName} applied to ${opts.jobTitle} on Beonely.`,
        `Review applications in your recruiter dashboard: ${opts.recruiterPortalUrl}`,
      ],
    }),
  }
}

export function candidateSignupEmail(opts: { name: string }) {
  const origin = serverSiteOrigin()
  return {
    subject: 'Welcome to Beonely',
    html: beonelyTransactionalHtml({
      headline: 'Welcome to Beonely',
      bodyParagraphs: [
        `Hi ${opts.name}, thanks for joining Beonely.`,
        'Complete your profile to apply to ServiceNow roles and get matched with hiring teams.',
        `Browse open roles: ${origin}`,
      ],
    }),
  }
}

export function recruiterSignupEmail(opts: { companyName: string }) {
  return {
    subject: 'Welcome to Beonely for recruiters',
    html: beonelyTransactionalHtml({
      headline: 'Your recruiter account is ready',
      bodyParagraphs: [
        `Thanks for signing up on behalf of ${opts.companyName}.`,
        'Post a paid listing when you are ready to reach ServiceNow talent on Beonely.',
        `Open your recruiter dashboard: ${serverSiteOrigin()}/recruiter`,
      ],
    }),
  }
}

export function listingExpiryReminderEmail(opts: {
  jobTitle: string
  companyName: string
  daysRemaining: number
  recruiterPortalUrl: string
}) {
  const dayLabel =
    opts.daysRemaining === 1 ? '1 day' : `${opts.daysRemaining} days`
  return {
    subject: `Beonely — listing expires in ${dayLabel}`,
    html: beonelyTransactionalHtml({
      headline: 'Listing expiring soon',
      bodyParagraphs: [
        `${opts.jobTitle} at ${opts.companyName} expires in ${dayLabel} on the public job board.`,
        `Extend or reactivate at the renewal rate from your recruiter dashboard: ${opts.recruiterPortalUrl}`,
      ],
    }),
  }
}

export function jobSubmittedRecruiterEmail(opts: {
  jobTitle: string
  companyName: string
}) {
  return {
    subject: `Listing submitted — ${opts.jobTitle}`,
    html: beonelyTransactionalHtml({
      headline: 'We received your listing',
      bodyParagraphs: [
        `${opts.jobTitle} at ${opts.companyName} is submitted for review.`,
        'Our team will approve eligible paid listings shortly. You will receive another email when it goes live.',
      ],
    }),
  }
}

export function applicationConfirmationCandidateEmail(opts: {
  jobTitle: string
  companyName: string
}) {
  return {
    subject: `Application sent — ${opts.jobTitle}`,
    html: beonelyTransactionalHtml({
      headline: 'Application submitted',
      bodyParagraphs: [
        `Your application to ${opts.jobTitle} at ${opts.companyName} was submitted successfully.`,
        'The hiring team will review your profile on Beonely. You can track applications from your candidate dashboard.',
      ],
    }),
  }
}

export const TRANSACTIONAL_TEMPLATE_SAMPLES = {
  jobApproved: () =>
    jobApprovedRecruiterEmail({
      jobTitle: 'Senior ServiceNow Developer',
      companyName: 'Acme Corp',
      jobSlug: 'senior-servicenow-developer-acme',
    }),
  jobRejected: () =>
    jobRejectedRecruiterEmail({
      jobTitle: 'Senior ServiceNow Developer',
      companyName: 'Acme Corp',
      reason: 'Please add more detail about required modules.',
    }),
  applicationReceived: () =>
    applicationReceivedRecruiterEmail({
      jobTitle: 'Senior ServiceNow Developer',
      candidateName: 'Alex Candidate',
      recruiterPortalUrl: `${serverSiteOrigin()}/recruiter`,
    }),
  applicationConfirmation: () =>
    applicationConfirmationCandidateEmail({
      jobTitle: 'Senior ServiceNow Developer',
      companyName: 'Acme Corp',
    }),
} as const

export function marketingCampaignEmail(opts: {
  subject: string
  previewText?: string | null
  bodyHtml: string
  unsubscribeUrl: string
}) {
  return {
    subject: opts.subject,
    html: beonelyMarketingHtml({
      previewText: opts.previewText,
      bodyHtml: opts.bodyHtml,
      unsubscribeUrl: opts.unsubscribeUrl,
    }),
  }
}
