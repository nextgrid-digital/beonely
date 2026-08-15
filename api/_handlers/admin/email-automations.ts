import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const triggerSchema = z.enum([
  'candidate_signup',
  'recruiter_signup',
  'job_submitted',
  'job_approved',
  'job_rejected',
  'application_received',
  'application_confirmation',
  'payment_received',
  'listing_expiry_reminder',
])

const patchSchema = z.object({
  trigger_key: triggerSchema,
  enabled: z.boolean(),
})

type AutomationRuleRow = Record<string, unknown> & { trigger_key: string }

const TRIGGER_LABELS: Record<string, string> = {
  candidate_signup: 'Candidate signup welcome',
  recruiter_signup: 'Recruiter signup welcome',
  job_submitted: 'Job submitted for review',
  job_approved: 'Job approved and live',
  job_rejected: 'Job rejected',
  application_received: 'Application received (recruiter)',
  application_confirmation: 'Application confirmation (candidate)',
  payment_received: 'Payment received',
  listing_expiry_reminder: 'Listing expiry reminder',
}

export async function handle(req: VercelRequest, res: VercelResponse) {
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client

  if (req.method === 'GET') {
    const [
      { data: rules, error: rulesError },
      { data: counts, error: countsError },
    ] = await Promise.all([
      sb.from('email_automation_rules').select('*').order('trigger_key'),
      sb.rpc('get_admin_email_automation_counts'),
    ])
    if (rulesError || countsError) {
      return res.status(503).json({ error: 'automations_unavailable' })
    }
    const countMap =
      counts && typeof counts === 'object' && !Array.isArray(counts)
        ? (counts as Record<string, { sent: number; failed: number }>)
        : {}

    return res.status(200).json({
      rules: ((rules ?? []) as AutomationRuleRow[]).map((r) => ({
        ...r,
        label: TRIGGER_LABELS[r.trigger_key as string] ?? r.trigger_key,
        last_7d: countMap[r.trigger_key as string] ?? { sent: 0, failed: 0 },
      })),
    })
  }

  if (req.method === 'PATCH') {
    const bodyRead = readJsonObjectBody(req)
    if (!bodyRead.ok) {
      return res.status(400).json({ error: 'invalid_json' })
    }
    const parsed = patchSchema.safeParse(bodyRead.value)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body' })
    }
    const { data: updated, error } = await sb
      .from('email_automation_rules')
      .update({
        enabled: parsed.data.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('trigger_key', parsed.data.trigger_key)
      .select('trigger_key')
      .maybeSingle()
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    if (!updated) return res.status(404).json({ error: 'automation_not_found' })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
