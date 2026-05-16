import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireStaffAdmin } from '../_lib/admin-auth.js'
import { readJsonObjectBody } from '../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../_lib/supabase.js'
import { dispatchTransactionalEmail } from '../_lib/dispatch-transactional-email.js'

const bodySchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  reason: z.string().optional().nullable(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    return res.status(400).json({ error: 'invalid_body' })
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client

  const { data: job, error: jobErr } = await sb
    .from('jobs')
    .select('id, job_title, job_slug, company_name, approval_status, recruiter_id')
    .eq('id', parsed.data.job_id)
    .single()
  if (jobErr || !job) {
    return res.status(404).json({ error: 'job_not_found' })
  }

  const { data: recruiter } = await sb
    .from('recruiters')
    .select('email, name')
    .eq('id', job.recruiter_id)
    .maybeSingle()

  const to = recruiter?.email?.trim()
  if (!to) {
    return res.status(422).json({ error: 'recruiter_email_missing' })
  }

  const trigger =
    parsed.data.status === 'approved' ? 'job_approved' : 'job_rejected'

  const result = await dispatchTransactionalEmail(sb, {
    trigger_key: trigger,
    to,
    recipient_role: 'recruiter',
    payload: {
      job_title: job.job_title,
      company_name: job.company_name,
      job_slug: job.job_slug,
      reason: parsed.data.reason,
    },
    dedupe_key: `${trigger}:${job.id}`,
  })

  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }

  return res.status(200).json({
    ok: true,
    skipped: result.ok && result.skipped,
    recipient: to,
  })
}
