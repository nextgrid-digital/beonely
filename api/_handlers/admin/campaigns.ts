import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const createSchema = z.object({
  subject: z.string().min(1),
  preview_text: z.string().optional().nullable(),
  body: z.string().min(1),
  template_id: z.string().uuid().optional().nullable(),
  audience: z.enum([
    'candidates',
    'recruiters',
    'newsletter',
    'all_marketing',
    'subscribers',
    'both',
  ]),
})

const updateSchema = createSchema.partial().extend({
  id: z.string().uuid(),
})

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
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ campaigns: data ?? [] })
  }

  if (req.method === 'POST') {
    const bodyRead = readJsonObjectBody(req)
    if (!bodyRead.ok) {
      return res.status(400).json({ error: 'invalid_json' })
    }
    const parsed = createSchema.safeParse(bodyRead.value)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body' })
    }
    const audience =
      parsed.data.audience === 'subscribers'
        ? 'newsletter'
        : parsed.data.audience === 'both'
          ? 'all_marketing'
          : parsed.data.audience

    const { data, error } = await sb
      .from('email_campaigns')
      .insert({
        subject: parsed.data.subject,
        preview_text: parsed.data.preview_text ?? null,
        body: parsed.data.body,
        audience,
        template_id: parsed.data.template_id ?? null,
        status: 'draft',
        created_by: admin.id,
      })
      .select('*')
      .single()
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(201).json({ campaign: data })
  }

  if (req.method === 'PATCH') {
    const bodyRead = readJsonObjectBody(req)
    if (!bodyRead.ok) {
      return res.status(400).json({ error: 'invalid_json' })
    }
    const parsed = updateSchema.safeParse(bodyRead.value)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body' })
    }
    const { id, ...rest } = parsed.data
    const patch: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    }
    if (rest.audience === 'subscribers') patch.audience = 'newsletter'
    if (rest.audience === 'both') patch.audience = 'all_marketing'

    const { data, error } = await sb
      .from('email_campaigns')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ campaign: data })
  }

  if (req.method === 'DELETE') {
    const id =
      typeof req.query.id === 'string'
        ? req.query.id
        : typeof req.body === 'object' &&
            req.body !== null &&
            'id' in req.body
          ? String((req.body as { id: unknown }).id)
          : ''
    if (!id) {
      return res.status(400).json({ error: 'missing_id' })
    }
    const { error } = await sb.from('email_campaigns').delete().eq('id', id)
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
