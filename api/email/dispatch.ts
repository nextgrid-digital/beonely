import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { readJsonObjectBody } from '../_lib/request-json-body.js'
import { getUserFromBearer, tryGetServiceSupabase } from '../_lib/supabase.js'
import {
  dispatchTransactionalEmail,
  type TransactionalTriggerKey,
} from '../_lib/dispatch-transactional-email.js'

const bodySchema = z.object({
  trigger_key: z.enum([
    'candidate_signup',
    'recruiter_signup',
    'job_submitted',
    'job_approved',
    'job_rejected',
    'application_received',
    'application_confirmation',
    'payment_received',
  ]),
  to: z.string().email().optional(),
  recipient_role: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  dedupe_key: z.string().optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
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

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const { user } = await getUserFromBearer(token)
  const to = parsed.data.to?.trim() || user?.email?.trim()
  if (!to) {
    return res.status(400).json({ error: 'missing_recipient' })
  }

  const result = await dispatchTransactionalEmail(sbInit.client, {
    trigger_key: parsed.data.trigger_key as TransactionalTriggerKey,
    to,
    recipient_role: parsed.data.recipient_role ?? 'unknown',
    payload: parsed.data.payload,
    dedupe_key: parsed.data.dedupe_key,
  })

  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }

  return res.status(200).json(result)
}
