import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const audienceSchema = z.enum(['candidates', 'recruiters', 'newsletter'])

const createSchema = z.object({
  name: z.string().min(1).max(200),
  audience: audienceSchema,
  subject: z.string().min(1).max(500),
  preview_text: z.string().max(500).optional().nullable(),
  body_html: z.string().min(1),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  preview_text: z.string().max(500).optional().nullable(),
  body_html: z.string().min(1).optional(),
})

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `custom-${base || 'template'}-${Date.now().toString(36)}`
}

function templateIdFromRequest(req: VercelRequest): string | null {
  const segments = req.query.segments
  if (Array.isArray(segments) && segments[0] === 'templates' && segments[1]) {
    return String(segments[1])
  }
  const pathname = (req.url ?? '').split('?')[0]
  const match = pathname.match(/\/api\/admin\/email\/templates\/([^/]+)$/)
  return match?.[1] ?? null
}

export async function handle(req: VercelRequest, res: VercelResponse) {
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client
  const templateId = templateIdFromRequest(req)

  if (!templateId) {
    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('email_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('audience', { ascending: true, nullsFirst: true })
        .order('name', { ascending: true })
      if (error) {
        return res.status(500).json({ error: error.message })
      }
      return res.status(200).json({ templates: data ?? [] })
    }

    if (req.method === 'POST') {
      const bodyRead = readJsonObjectBody(req)
      if (!bodyRead.ok) {
        return res.status(400).json({ error: 'invalid_json' })
      }
      const parsed = createSchema.safeParse(bodyRead.value)
      if (!parsed.success) {
        return res.status(400).json({
          error: 'invalid_body',
          details: parsed.error.flatten(),
        })
      }
      const { data, error } = await sb
        .from('email_templates')
        .insert({
          slug: slugify(parsed.data.name),
          name: parsed.data.name,
          category: 'marketing',
          audience: parsed.data.audience,
          subject: parsed.data.subject,
          preview_text: parsed.data.preview_text ?? null,
          body_html: parsed.data.body_html,
          shell: 'marketing',
          is_system: false,
          created_by: admin.id,
        })
        .select('*')
        .single()
      if (error) {
        return res.status(500).json({ error: error.message })
      }
      return res.status(201).json({ template: data })
    }

    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle()
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    if (!data) {
      return res.status(404).json({ error: 'not_found' })
    }
    return res.status(200).json({ template: data })
  }

  if (req.method === 'PATCH') {
    const { data: existing, error: loadErr } = await sb
      .from('email_templates')
      .select('category, is_system')
      .eq('id', templateId)
      .maybeSingle()
    if (loadErr) {
      return res.status(500).json({ error: loadErr.message })
    }
    if (!existing) {
      return res.status(404).json({ error: 'not_found' })
    }
    if (existing.category !== 'marketing') {
      return res.status(403).json({ error: 'transactional_read_only' })
    }

    const bodyRead = readJsonObjectBody(req)
    if (!bodyRead.ok) {
      return res.status(400).json({ error: 'invalid_json' })
    }
    const parsed = updateSchema.safeParse(bodyRead.value)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      })
    }

    const { data, error } = await sb
      .from('email_templates')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select('*')
      .single()
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ template: data })
  }

  if (req.method === 'DELETE') {
    const { data: existing, error: loadErr } = await sb
      .from('email_templates')
      .select('is_system, category')
      .eq('id', templateId)
      .maybeSingle()
    if (loadErr) {
      return res.status(500).json({ error: loadErr.message })
    }
    if (!existing) {
      return res.status(404).json({ error: 'not_found' })
    }
    if (existing.is_system) {
      return res.status(403).json({ error: 'system_template_protected' })
    }

    const { error } = await sb
      .from('email_templates')
      .delete()
      .eq('id', templateId)
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}

/** POST duplicate body: { source_id: uuid } */
export async function handleDuplicate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client

  const bodyRead = readJsonObjectBody(req)
  if (!bodyRead.ok) {
    return res.status(400).json({ error: 'invalid_json' })
  }
  const sourceId = z
    .object({ source_id: z.string().uuid() })
    .safeParse(bodyRead.value)
  if (!sourceId.success) {
    return res.status(400).json({ error: 'invalid_body' })
  }

  const { data: source, error: loadErr } = await sb
    .from('email_templates')
    .select('*')
    .eq('id', sourceId.data.source_id)
    .maybeSingle()
  if (loadErr) {
    return res.status(500).json({ error: loadErr.message })
  }
  if (!source) {
    return res.status(404).json({ error: 'not_found' })
  }
  if (source.category !== 'marketing') {
    return res.status(400).json({ error: 'only_marketing_duplicable' })
  }

  const { data, error } = await sb
    .from('email_templates')
    .insert({
      slug: slugify(`${source.name} copy`),
      name: `${source.name} (copy)`,
      category: 'marketing',
      audience: source.audience,
      subject: source.subject,
      preview_text: source.preview_text,
      body_html: source.body_html,
      shell: 'marketing',
      is_system: false,
      created_by: admin.id,
    })
    .select('*')
    .single()
  if (error) {
    return res.status(500).json({ error: error.message })
  }
  return res.status(201).json({ template: data })
}
