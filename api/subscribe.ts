import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { readJsonObjectBody } from '../_lib/request-json-body.js'
import { rateLimitOrThrow } from '../_lib/rate-limit.js'
import { tryGetServiceSupabase } from '../_lib/supabase.js'

const bodySchema = z.object({
  email: z.string().email(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown'
    await rateLimitOrThrow(`subscribe:${ip}`)

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
    const email = parsed.data.email.trim().toLowerCase()

    const { data: existing } = await sb
      .from('email_subscribers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing?.id) {
      await sb
        .from('email_subscribers')
        .update({
          audience: 'newsletter',
          unsubscribed_at: null,
          source: 'footer',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await sb.from('email_subscribers').insert({
        email,
        audience: 'newsletter',
        source: 'footer',
      })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: msg })
  }
}
