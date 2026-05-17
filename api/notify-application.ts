import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { readJsonObjectBody } from './_lib/request-json-body.js'
import { rateLimitOrThrow } from './_lib/rate-limit.js'
import { getUserFromBearer, tryGetServiceSupabase } from './_lib/supabase.js'
import { dispatchTransactionalEmail } from './_lib/dispatch-transactional-email.js'

const bodySchema = z.object({
  job_id: z.string().uuid(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown'
    await rateLimitOrThrow(`notify-application:${ip}`)

    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const { user } = await getUserFromBearer(token)
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' })
    }

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

    const { data: job } = await sb
      .from('jobs')
      .select('id, job_title, company_name, recruiter_id')
      .eq('id', parsed.data.job_id)
      .single()
    if (!job) {
      return res.status(404).json({ error: 'job_not_found' })
    }

    const { data: application } = await sb
      .from('applications')
      .select('candidate_email, candidate_name')
      .eq('job_id', parsed.data.job_id)
      .eq('candidate_user_id', user.id)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!application) {
      return res.status(404).json({ error: 'application_not_found' })
    }

    const { data: recruiter } = await sb
      .from('recruiters')
      .select('email')
      .eq('id', job.recruiter_id)
      .maybeSingle()

    const appId = `${parsed.data.job_id}:${user.id}`
    let skipped = false

    if (recruiter?.email) {
      const r = await dispatchTransactionalEmail(sb, {
        trigger_key: 'application_received',
        to: recruiter.email,
        recipient_role: 'recruiter',
        payload: {
          job_title: job.job_title,
          candidate_name: application.candidate_name ?? 'Candidate',
        },
        dedupe_key: `application_received:${appId}`,
      })
      if (r.ok && r.skipped) skipped = true
    }

    const candidateEmail = application.candidate_email?.trim() || user.email
    if (candidateEmail) {
      const r = await dispatchTransactionalEmail(sb, {
        trigger_key: 'application_confirmation',
        to: candidateEmail,
        recipient_role: 'candidate',
        payload: {
          job_title: job.job_title,
          company_name: job.company_name,
        },
        dedupe_key: `application_confirmation:${appId}`,
      })
      if (r.ok && r.skipped) skipped = true
    }

    return res.status(200).json({ ok: true, skipped })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: msg })
  }
}
