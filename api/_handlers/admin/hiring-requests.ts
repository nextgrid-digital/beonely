import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    'new',
    'contacted',
    'qualified',
    'proposal_sent',
    'closed_won',
    'closed_lost',
    'spam',
  ]),
  assigned_to_email: z.string().email().max(160).optional().nullable(),
  internal_notes: z.string().max(6000).optional().nullable(),
  touch_contacted_at: z.boolean().optional(),
})

function normalize(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
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
    const { data, error } = await sb
      .from('hiring_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ requests: data ?? [] })
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

    const patch = {
      status: parsed.data.status,
      assigned_to_email: normalize(parsed.data.assigned_to_email),
      internal_notes: normalize(parsed.data.internal_notes),
      ...(parsed.data.touch_contacted_at
        ? { last_contacted_at: new Date().toISOString() }
        : {}),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await sb
      .from('hiring_requests')
      .update(patch)
      .eq('id', parsed.data.id)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ request: data })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
