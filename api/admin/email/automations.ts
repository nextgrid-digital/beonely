import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const patchSchema = z.object({
  trigger_key: z.string(),
  enabled: z.boolean(),
})

const TRIGGER_LABELS: Record<string, string> = {
  candidate_signup: 'Candidate signup welcome',
  recruiter_signup: 'Recruiter signup welcome',
  job_submitted: 'Job submitted for review',
  job_approved: 'Job approved and live',
  job_rejected: 'Job rejected',
  application_received: 'Application received (recruiter)',
  application_confirmation: 'Application confirmation (candidate)',
  payment_received: 'Payment received',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client

  if (req.method === 'GET') {
    const { data: rules } = await sb
      .from('email_automation_rules')
      .select('*')
      .order('trigger_key')

    const since = new Date()
    since.setDate(since.getDate() - 7)

    const { data: logs } = await sb
      .from('email_send_log')
      .select('trigger_key, status')
      .gte('created_at', since.toISOString())
      .not('trigger_key', 'is', null)

    const counts: Record<string, { sent: number; failed: number }> = {}
    for (const row of logs ?? []) {
      const key = row.trigger_key as string
      if (!counts[key]) counts[key] = { sent: 0, failed: 0 }
      if (row.status === 'failed' || row.status === 'bounced') {
        counts[key].failed += 1
      } else {
        counts[key].sent += 1
      }
    }

    return res.status(200).json({
      rules: (rules ?? []).map((r) => ({
        ...r,
        label: TRIGGER_LABELS[r.trigger_key as string] ?? r.trigger_key,
        last_7d: counts[r.trigger_key as string] ?? { sent: 0, failed: 0 },
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
    const { error } = await sb
      .from('email_automation_rules')
      .update({
        enabled: parsed.data.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('trigger_key', parsed.data.trigger_key)
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
