import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { readJsonObjectBody } from './_lib/request-json-body.js'
import { rateLimitOrThrow } from './_lib/rate-limit.js'
import { tryGetServiceSupabase } from './_lib/supabase.js'

const bodySchema = z.object({
  company_name: z.string().min(2).max(120),
  contact_name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().nullable(),
  company_website: z.string().url().max(240).optional().nullable(),
  role_title: z.string().min(2).max(160),
  hiring_type: z.enum(['full_time', 'contract', 'multiple', 'not_sure']),
  work_mode: z.enum(['remote', 'hybrid', 'onsite', 'flexible']).optional().nullable(),
  location: z.string().max(160).optional().nullable(),
  timeline: z.string().max(120).optional().nullable(),
  headcount: z.number().int().positive().max(100).optional().nullable(),
  servicenow_scope: z.string().max(500).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown'
    await rateLimitOrThrow(`hiring-request:${ip}`)

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
    const input = parsed.data

    const normalize = (value?: string | null) => {
      const trimmed = value?.trim()
      return trimmed ? trimmed : null
    }

    const { data, error } = await sb
      .from('hiring_requests')
      .insert({
        company_name: input.company_name.trim(),
        contact_name: input.contact_name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: normalize(input.phone),
        company_website: normalize(input.company_website),
        role_title: input.role_title.trim(),
        hiring_type: input.hiring_type,
        work_mode: input.work_mode ?? null,
        location: normalize(input.location),
        timeline: normalize(input.timeline),
        headcount: input.headcount ?? null,
        servicenow_scope: normalize(input.servicenow_scope),
        notes: normalize(input.notes),
        status: 'new',
        source: 'hire_page',
      })
      .select('id')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json({ ok: true, id: data.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: msg })
  }
}
