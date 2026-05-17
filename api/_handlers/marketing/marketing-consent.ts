import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { getUserFromBearer, tryGetServiceSupabase } from '../../_lib/supabase.js'
import { syncProfileMarketingOptIn } from '../../_lib/campaign-send.js'

const bodySchema = z.object({
  marketing_opt_in: z.boolean(),
  audience: z.enum(['candidate', 'recruiter']),
})

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const { user } = await getUserFromBearer(token)
  if (!user?.email) {
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

  await syncProfileMarketingOptIn(sbInit.client, {
    email: user.email,
    audience: parsed.data.audience,
    optIn: parsed.data.marketing_opt_in,
  })

  return res.status(200).json({ ok: true })
}
