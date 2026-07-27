import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAllowlistedAdminEmail } from '../../_lib/admin-access.js'
import { safeResumeStoragePath } from '../../_lib/private-assets.js'
import { isRateLimitError, rateLimitOrThrow } from '../../_lib/rate-limit.js'
import {
  getUserFromBearer,
  tryGetServiceSupabase,
} from '../../_lib/supabase.js'

const inputSchema = z.object({ application_id: z.string().uuid() }).strict()
const SIGNED_URL_TTL_SECONDS = 5 * 60

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  res.setHeader('Cache-Control', 'private, no-store')

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim()
  const auth = await getUserFromBearer(token)
  if (!auth.user) return res.status(401).json({ error: 'unauthorized' })

  const parsed = inputSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_request' })

  try {
    await rateLimitOrThrow(`application-asset:${auth.user.id}`, {
      limit: 40,
      windowSeconds: 300,
    })
    const supInit = tryGetServiceSupabase()
    if (!supInit.ok) return res.status(503).json({ error: 'server_config' })
    const sb = supInit.client

    const [
      { data: application, error: applicationError },
      { data: recruiter },
    ] = await Promise.all([
      sb
        .from('applications')
        .select('candidate_user_id, recruiter_id, resume_storage_path')
        .eq('id', parsed.data.application_id)
        .maybeSingle(),
      sb
        .from('recruiters')
        .select('id, role, disabled')
        .eq('user_id', auth.user.id)
        .maybeSingle(),
    ])

    if (applicationError || !application || !recruiter || recruiter.disabled) {
      return res.status(404).json({ error: 'not_found' })
    }
    const authorizedAdmin =
      recruiter.role === 'admin' &&
      Boolean(
        auth.user.email &&
        auth.user.email_confirmed_at &&
        isAllowlistedAdminEmail(auth.user.email)
      )
    const authorized =
      authorizedAdmin || recruiter.id === application.recruiter_id
    if (!authorized) return res.status(404).json({ error: 'not_found' })

    const path = safeResumeStoragePath(
      application.resume_storage_path,
      application.candidate_user_id
    )
    if (!path) return res.status(404).json({ error: 'resume_not_found' })

    const { data, error } = await sb.storage
      .from('resumes')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error || !data?.signedUrl) {
      return res.status(404).json({ error: 'resume_not_found' })
    }
    return res.status(200).json({
      url: data.signedUrl,
      expires_in: SIGNED_URL_TTL_SECONDS,
    })
  } catch (error) {
    if (isRateLimitError(error)) {
      res.setHeader('Retry-After', String(error.retryAfterSeconds))
      return res.status(error.statusCode).json({ error: error.code })
    }
    return res.status(500).json({ error: 'asset_unavailable' })
  }
}
