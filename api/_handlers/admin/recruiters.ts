import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const bodySchema = z.object({
  id: z.string().uuid(),
  disabled: z.boolean(),
})

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  const bodyRead = readJsonObjectBody(req)
  if (!bodyRead.ok) return res.status(400).json({ error: 'invalid_json' })
  const parsed = bodySchema.safeParse(bodyRead.value)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' })

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) return res.status(503).json({ error: sbInit.reason })
  const sb = sbInit.client
  const { data: target, error: lookupError } = await sb
    .from('recruiters')
    .select('id, user_id, disabled')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (lookupError) return res.status(503).json({ error: 'lookup_failed' })
  if (!target) return res.status(404).json({ error: 'recruiter_not_found' })
  if (target.user_id === admin.id && parsed.data.disabled) {
    return res.status(409).json({ error: 'cannot_disable_self' })
  }

  const { data: updated, error } = await sb
    .from('recruiters')
    .update({ disabled: parsed.data.disabled })
    .eq('id', target.id)
    .eq('disabled', target.disabled)
    .select('*')
    .maybeSingle()
  if (error) return res.status(503).json({ error: 'update_failed' })
  if (!updated)
    return res.status(409).json({ error: 'recruiter_changed_retry' })

  await sb.from('admin_audit_log').insert({
    actor_user_id: admin.id,
    actor_email: admin.email ?? '',
    action: parsed.data.disabled ? 'recruiter.disable' : 'recruiter.enable',
    target_type: 'recruiter',
    target_id: target.id,
    metadata: { disabled: parsed.data.disabled },
  })
  return res.status(200).json({ recruiter: updated })
}
