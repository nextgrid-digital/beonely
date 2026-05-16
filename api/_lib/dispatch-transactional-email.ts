import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applicationConfirmationCandidateEmail,
  applicationReceivedRecruiterEmail,
  candidateSignupEmail,
  jobApprovedRecruiterEmail,
  jobRejectedRecruiterEmail,
  jobSubmittedRecruiterEmail,
  recruiterSignupEmail,
} from './email-templates.js'
import { sendTransactionalEmail } from './resend.js'

export type TransactionalTriggerKey =
  | 'candidate_signup'
  | 'recruiter_signup'
  | 'job_submitted'
  | 'job_approved'
  | 'job_rejected'
  | 'application_received'
  | 'application_confirmation'
  | 'payment_received'

export type DispatchPayload = Record<string, unknown>

function siteOrigin(): string {
  const raw = process.env.VITE_PUBLIC_SITE_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return 'https://beonely.vercel.app'
}

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
        reason:
          typeof payload.reason === 'string' ? payload.reason : null,
      })
    case 'application_received':
      return applicationReceivedRecruiterEmail({
        jobTitle: String(payload.job_title),
        candidateName: String(payload.candidate_name),
        recruiterPortalUrl: `${siteOrigin()}/recruiter`,
      })
    case 'application_confirmation':
      return applicationConfirmationCandidateEmail({
        jobTitle: String(payload.job_title),
        companyName: String(payload.company_name),
      })
    case 'payment_received':
      return null
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
    /** Skip dedupe lookup (test sends use unique keys each time). */
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

  if (opts.dedupe_key && !opts.skip_dedupe_check) {
    const { data: existing, error: dedupeErr } = await sb
      .from('email_send_log')
      .select('id')
      .filter('metadata->>dedupe_key', 'eq', opts.dedupe_key)
      .maybeSingle()
    if (dedupeErr) {
      return { ok: false, error: `dedupe_check_failed: ${dedupeErr.message}` }
    }
    if (existing?.id) return { ok: true, skipped: true, reason: 'dedupe' }
  }

  const rendered = renderEmail(opts.trigger_key, opts.payload ?? {})
  if (!rendered) return { ok: false, error: 'unknown_trigger' }

  try {
    const result = await sendTransactionalEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
    })

    const status = result.skipped ? 'skipped' : 'sent'
    const { data: logRow, error: logErr } = await sb
      .from('email_send_log')
      .insert({
        trigger_key: opts.trigger_key,
        recipient_email: email,
        recipient_role: opts.recipient_role,
        subject: rendered.subject,
        resend_message_id: result.skipped ? null : result.messageId,
        status,
        error_message: result.skipped ? 'resend_not_configured' : null,
        metadata: {
          ...(opts.metadata ?? {}),
          ...(opts.dedupe_key ? { dedupe_key: opts.dedupe_key } : {}),
        },
      })
      .select('id')
      .single()

    if (logErr) {
      if (!result.skipped) {
        return {
          ok: true,
          skipped: false,
          messageId: result.messageId,
          logId: null,
          resend_skipped: false,
          log_error: logErr.message,
        }
      }
      return { ok: false, error: `log_insert_failed: ${logErr.message}` }
    }

    return {
      ok: true,
      skipped: false,
      messageId: result.skipped ? null : result.messageId,
      logId: logRow.id as string,
      resend_skipped: result.skipped,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'send_failed'
    await sb.from('email_send_log').insert({
      trigger_key: opts.trigger_key,
      recipient_email: email,
      recipient_role: opts.recipient_role,
      subject: rendered.subject,
      status: 'failed',
      error_message: msg,
      metadata: {
        ...(opts.metadata ?? {}),
        ...(opts.dedupe_key ? { dedupe_key: opts.dedupe_key } : {}),
      },
    })
    return { ok: false, error: msg }
  }
}
