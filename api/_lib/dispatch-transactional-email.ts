import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import {
  claimEmailDelivery,
  finishEmailDelivery,
} from './email-delivery-claim.js'
import { beonelyTransactionalHtml } from './email-layout.js'
import {
  applicationConfirmationCandidateEmail,
  applicationReceivedRecruiterEmail,
  candidateSignupEmail,
  jobApprovedRecruiterEmail,
  jobRejectedRecruiterEmail,
  jobSubmittedRecruiterEmail,
  listingExpiryReminderEmail,
  recruiterSignupEmail,
} from './email-templates.js'
import { sendTransactionalEmail } from './resend.js'
import { serverSiteOrigin } from './site-origin.js'

export type TransactionalTriggerKey =
  | 'candidate_signup'
  | 'recruiter_signup'
  | 'job_submitted'
  | 'job_approved'
  | 'job_rejected'
  | 'application_received'
  | 'application_confirmation'
  | 'listing_expiry_reminder'
  | 'payment_received'

export type DispatchPayload = Record<string, unknown>

function renderEmail(
  trigger: TransactionalTriggerKey,
  payload: DispatchPayload
): { subject: string; html: string } | null {
  switch (trigger) {
    case 'candidate_signup':
      return candidateSignupEmail({
        name: String(payload.name ?? 'there'),
      })
    case 'recruiter_signup':
      return recruiterSignupEmail({
        companyName: String(payload.company_name ?? 'your company'),
      })
    case 'job_submitted':
      return jobSubmittedRecruiterEmail({
        jobTitle: String(payload.job_title),
        companyName: String(payload.company_name),
      })
    case 'job_approved':
      return jobApprovedRecruiterEmail({
        jobTitle: String(payload.job_title),
        companyName: String(payload.company_name),
        jobSlug: String(payload.job_slug),
      })
    case 'job_rejected':
      return jobRejectedRecruiterEmail({
        jobTitle: String(payload.job_title),
        companyName: String(payload.company_name),
        reason: typeof payload.reason === 'string' ? payload.reason : null,
      })
    case 'application_received':
      return applicationReceivedRecruiterEmail({
        jobTitle: String(payload.job_title),
        candidateName: String(payload.candidate_name),
        recruiterPortalUrl: `${serverSiteOrigin()}/recruiter`,
      })
    case 'application_confirmation':
      return applicationConfirmationCandidateEmail({
        jobTitle: String(payload.job_title),
        companyName: String(payload.company_name),
      })
    case 'listing_expiry_reminder':
      return listingExpiryReminderEmail({
        jobTitle: String(payload.job_title),
        companyName: String(payload.company_name),
        daysRemaining: Number(payload.days_remaining),
        recruiterPortalUrl: `${serverSiteOrigin()}/recruiter`,
      })
    case 'payment_received':
      return {
        subject: String(payload.subject ?? 'Beonely — payment received'),
        html: beonelyTransactionalHtml({
          headline: String(payload.headline ?? 'Payment received'),
          bodyParagraphs: Array.isArray(payload.body_paragraphs)
            ? payload.body_paragraphs.map(String)
            : ['Your Beonely payment was received.'],
        }),
      }
    default: {
      const _exhaustive: never = trigger
      return _exhaustive
    }
  }
}

export type DispatchResult =
  | { ok: true; skipped: true; reason?: string }
  | {
      ok: true
      skipped: false
      messageId: string | null
      logId: string | null
      resend_skipped?: boolean
      log_error?: string
    }
  | { ok: false; error: string }

export async function dispatchTransactionalEmail(
  sb: SupabaseClient,
  opts: {
    trigger_key: TransactionalTriggerKey
    to: string
    recipient_role: string
    payload?: DispatchPayload
    dedupe_key?: string
    metadata?: Record<string, unknown>
    /** Test sends and staff overrides — ignore automation off toggles. */
    bypass_automation_rule?: boolean
    /** Force a unique claim (test sends must be deliverable more than once). */
    skip_dedupe_check?: boolean
  }
): Promise<DispatchResult> {
  const email = opts.to.trim().toLowerCase()
  if (!email) return { ok: false, error: 'missing_recipient' }

  if (!opts.bypass_automation_rule) {
    const { data: rule } = await sb
      .from('email_automation_rules')
      .select('enabled')
      .eq('trigger_key', opts.trigger_key)
      .maybeSingle()

    if (rule && rule.enabled === false) {
      return { ok: true, skipped: true, reason: 'automation_disabled' }
    }
  }

  const rendered = renderEmail(opts.trigger_key, opts.payload ?? {})
  if (!rendered) return { ok: false, error: 'unknown_trigger' }

  const requestedDedupeKey = opts.dedupe_key?.trim()
  const dedupeKey =
    requestedDedupeKey && !opts.skip_dedupe_check
      ? requestedDedupeKey
      : `dispatch:${randomUUID()}`

  let claim
  try {
    claim = await claimEmailDelivery(sb, {
      triggerKey: opts.trigger_key,
      recipientEmail: email,
      recipientRole: opts.recipient_role,
      subject: rendered.subject,
      dedupeKey,
      metadata: {
        ...(opts.metadata ?? {}),
        ...(requestedDedupeKey && opts.skip_dedupe_check
          ? { requested_dedupe_key: requestedDedupeKey }
          : {}),
      },
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'delivery_claim_failed',
    }
  }

  if (!claim.claimed) {
    return { ok: true, skipped: true, reason: claim.reason }
  }

  try {
    const result = await sendTransactionalEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      idempotencyKey: `transactional/${claim.logId}`,
    })

    await finishEmailDelivery(sb, {
      logId: claim.logId,
      claimToken: claim.claimToken,
      status: result.skipped ? 'skipped' : 'sent',
      messageId: result.skipped ? null : result.messageId,
      errorMessage: result.skipped ? 'resend_not_configured' : null,
    })

    return {
      ok: true,
      skipped: false,
      messageId: result.skipped ? null : result.messageId,
      logId: claim.logId,
      resend_skipped: result.skipped,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'send_failed'
    try {
      await finishEmailDelivery(sb, {
        logId: claim.logId,
        claimToken: claim.claimToken,
        status: 'failed',
        errorMessage: msg.slice(0, 500),
      })
    } catch (finishError) {
      const finishMessage =
        finishError instanceof Error
          ? finishError.message
          : 'delivery_finalize_failed'
      return { ok: false, error: `${msg}; ${finishMessage}` }
    }
    return { ok: false, error: msg }
  }
}
