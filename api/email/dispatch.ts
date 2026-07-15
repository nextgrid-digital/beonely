import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { dispatchTransactionalEmail } from '../_lib/dispatch-transactional-email.js'
import { isRateLimitError, rateLimitOrThrow } from '../_lib/rate-limit.js'
import { readJsonObjectBody } from '../_lib/request-json-body.js'
import { getUserFromBearer, tryGetServiceSupabase } from '../_lib/supabase.js'

// This public client route is intentionally limited to a signed-in user's own
// signup email. Staff test sends and job/application mail have dedicated,
// authorization-aware server routes.
const bodySchema = z.object({
  trigger_key: z.enum(['candidate_signup', 'recruiter_signup']),
})

function requestIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return raw?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
}

function rateLimitResponse(error: unknown, res: VercelResponse): boolean {
  if (!isRateLimitError(error)) return false
  res.setHeader('Retry-After', String(error.retryAfterSeconds))
  res.status(error.statusCode).json({ error: error.code })
  return true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    await rateLimitOrThrow(`email-dispatch:${requestIp(req)}`, {
      limit: 8,
      windowSeconds: 60,
    })

    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const { user } = await getUserFromBearer(token)
    if (!user?.email || !user.email_confirmed_at) {
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
      return res.status(503).json({ error: 'service_unavailable' })
    }
    const sb = sbInit.client

    if (parsed.data.trigger_key === 'candidate_signup') {
      const { data: profile, error } = await sb
        .from('job_seeker_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) {
        return res.status(503).json({ error: 'profile_lookup_failed' })
      }
      if (!profile) {
        return res.status(403).json({ error: 'candidate_profile_required' })
      }

      const metadataName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name.trim()
          : ''
      const result = await dispatchTransactionalEmail(sb, {
        trigger_key: 'candidate_signup',
        to: user.email,
        recipient_role: 'candidate',
        payload: {
          name:
            profile.full_name?.trim() ||
            metadataName ||
            user.email.split('@')[0],
        },
        dedupe_key: `candidate_signup:${user.id}`,
      })
      return res.status(result.ok ? 200 : 500).json(result)
    }

    const { data: recruiter, error } = await sb
      .from('recruiters')
      .select('company_name, disabled')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) {
      return res.status(503).json({ error: 'profile_lookup_failed' })
    }
    if (!recruiter || recruiter.disabled) {
      return res.status(403).json({ error: 'active_recruiter_required' })
    }

    const result = await dispatchTransactionalEmail(sb, {
      trigger_key: 'recruiter_signup',
      to: user.email,
      recipient_role: 'recruiter',
      payload: { company_name: recruiter.company_name },
      dedupe_key: `recruiter_signup:${user.id}`,
    })
    return res.status(result.ok ? 200 : 500).json(result)
  } catch (error) {
    if (rateLimitResponse(error, res)) return
    return res.status(500).json({ error: 'internal_error' })
  }
}
