import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'
import {
  dispatchTransactionalEmail,
  type TransactionalTriggerKey,
} from '../../_lib/dispatch-transactional-email.js'
import { sendCampaignBatch } from '../../_lib/campaign-send.js'

const bodySchema = z.object({
  to: z.string().email(),
  trigger_key: z
    .enum([
      'candidate_signup',
      'recruiter_signup',
      'job_submitted',
      'job_approved',
      'job_rejected',
      'application_received',
      'application_confirmation',
    ])
    .optional(),
  campaign_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  const bodyRead = readJsonObjectBody(req)
  if (!bodyRead.ok) {
    return res.status(400).json({ error: 'invalid_json' })
  }
  const parsed = bodySchema.safeParse(bodyRead.value)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'invalid_body',
      details: parsed.error.flatten(),
    })
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client
  const to = parsed.data.to.trim().toLowerCase()

  if (parsed.data.campaign_id) {
    const progress = await sendCampaignBatch(sb, parsed.data.campaign_id, {
      testEmails: [to],
    })
    return res.status(200).json({ ok: true, campaign: progress })
  }

  if (!parsed.data.trigger_key) {
    return res.status(400).json({ error: 'missing_trigger_or_campaign' })
  }

  const result = await dispatchTransactionalEmail(sb, {
    trigger_key: parsed.data.trigger_key as TransactionalTriggerKey,
    to,
    recipient_role: 'test',
    payload: parsed.data.payload ?? samplePayload(parsed.data.trigger_key),
    dedupe_key: `test:${parsed.data.trigger_key}:${to}:${Date.now()}`,
    bypass_automation_rule: true,
    skip_dedupe_check: true,
    metadata: { test_send: true },
  })

  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }

  if (result.skipped) {
    return res.status(200).json({
      ok: true,
      sent: false,
      skipped: true,
      reason: result.reason ?? 'skipped',
    })
  }

  if (result.resend_skipped) {
    return res.status(200).json({
      ok: true,
      sent: false,
      skipped: true,
      reason: 'resend_not_configured',
      hint: 'Set RESEND_API_KEY and RESEND_FROM_EMAIL on the API (Vercel env or .env.local for pnpm dev:local).',
      logId: result.logId,
      log_error: result.log_error,
    })
  }

  return res.status(200).json({
    ok: true,
    sent: true,
    skipped: false,
    messageId: result.messageId,
    logId: result.logId,
    log_error: result.log_error,
  })
}

function samplePayload(trigger: string): Record<string, unknown> {
  const base = {
    job_title: 'Senior ServiceNow Developer',
    company_name: 'Acme Corp',
    job_slug: 'senior-servicenow-developer-acme',
    candidate_name: 'Alex Candidate',
    name: 'Alex',
    reason: 'Sample rejection reason for test.',
  }
  if (trigger === 'candidate_signup') return { name: 'Alex' }
  if (trigger === 'recruiter_signup') return { company_name: 'Acme Corp' }
  return base
}
