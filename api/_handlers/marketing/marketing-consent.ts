import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { syncProfileMarketingOptIn } from '../../_lib/campaign-send.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import {
  getUserFromBearer,
  tryGetServiceSupabase,
} from '../../_lib/supabase.js'

const bodySchema = z.object({
  marketing_opt_in: z.boolean(),
  // Accepted for backward compatibility, but never trusted for authorization.
  audience: z.enum(['candidate', 'recruiter']).optional(),
})

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const { user } = await getUserFromBearer(token)
  if (!user?.email) return res.status(401).json({ error: 'unauthorized' })

  const bodyRead = readJsonObjectBody(req)
  if (!bodyRead.ok) return res.status(400).json({ error: 'invalid_json' })
  const parsed = bodySchema.safeParse(bodyRead.value)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' })

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) return res.status(503).json({ error: sbInit.reason })
  const { data: recruiter, error } = await sbInit.client
    .from('recruiters')
    .select('id, disabled')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return res.status(503).json({ error: 'profile_lookup_failed' })
  if (recruiter?.disabled) {
    return res.status(403).json({ error: 'account_disabled' })
  }

  const audience = recruiter ? 'recruiter' : 'candidate'
  try {
    await syncProfileMarketingOptIn(sbInit.client, {
      email: user.email,
      userId: user.id,
      audience,
      optIn: parsed.data.marketing_opt_in,
    })
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(503).json({ error: 'consent_update_failed' })
  }
}
