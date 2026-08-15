import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beonelyTransactionalHtml } from '../../_lib/email-layout.js'
import { isRateLimitError, rateLimitOrThrow } from '../../_lib/rate-limit.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { sendTransactionalEmail } from '../../_lib/resend.js'
import { serverSiteOrigin } from '../../_lib/site-origin.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const bodySchema = z.object({
  company_name: z.string().min(2).max(120),
  contact_name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().nullable(),
  company_website: z
    .string()
    .url()
    .max(240)
    .refine((value) => /^https?:\/\//i.test(value), {
      message: 'company_website must use http or https',
    })
    .optional()
    .nullable(),
  role_title: z.string().min(2).max(160),
  hiring_type: z.enum(['full_time', 'contract', 'multiple', 'not_sure']),
  work_mode: z
    .enum(['remote', 'hybrid', 'onsite', 'flexible'])
    .optional()
    .nullable(),
  location: z.string().max(160).optional().nullable(),
  timeline: z.string().max(120).optional().nullable(),
  headcount: z.number().int().positive().max(100).optional().nullable(),
  servicenow_scope: z.string().max(500).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
})

function internalRecipients(): string[] {
  return (process.env.HIRING_REQUEST_NOTIFICATION_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => z.string().email().safeParse(email).success)
}

function normalize(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function buildInternalNotificationHtml(input: {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone?: string | null
  company_website?: string | null
  role_title: string
  hiring_type: string
  work_mode?: string | null
  location?: string | null
  timeline?: string | null
  headcount?: number | null
  servicenow_scope?: string | null
  notes?: string | null
}) {
  const detailLines = [
    `Company: ${input.company_name}`,
    `Contact: ${input.contact_name}`,
    `Email: ${input.email}`,
    ...(input.phone ? [`Phone: ${input.phone}`] : []),
    ...(input.company_website ? [`Website: ${input.company_website}`] : []),
    `Role: ${input.role_title}`,
    `Hiring type: ${input.hiring_type}`,
    ...(input.work_mode ? [`Work mode: ${input.work_mode}`] : []),
    ...(input.location ? [`Location: ${input.location}`] : []),
    ...(input.timeline ? [`Timeline: ${input.timeline}`] : []),
    ...(input.headcount ? [`Headcount: ${input.headcount}`] : []),
    ...(input.servicenow_scope
      ? [`ServiceNow scope: ${input.servicenow_scope}`]
      : []),
    ...(input.notes ? [`Notes: ${input.notes}`] : []),
    `Admin queue: ${serverSiteOrigin()}/admin/hiring-requests`,
    `Request ID: ${input.id}`,
  ]

  return beonelyTransactionalHtml({
    headline: `New hiring request — ${input.role_title}`,
    bodyParagraphs: [
      `${input.contact_name} from ${input.company_name} submitted a new Beonely hiring request.`,
      ...detailLines,
    ],
  })
}

async function notifyInternalTeam(
  sb: SupabaseClient,
  input: {
    id: string
    company_name: string
    contact_name: string
    email: string
    phone?: string | null
    company_website?: string | null
    role_title: string
    hiring_type: string
    work_mode?: string | null
    location?: string | null
    timeline?: string | null
    headcount?: number | null
    servicenow_scope?: string | null
    notes?: string | null
  }
) {
  const subject = `Beonely hiring request — ${input.role_title} @ ${input.company_name}`
  const html = buildInternalNotificationHtml(input)

  for (const recipient of internalRecipients()) {
    try {
      const result = await sendTransactionalEmail({
        to: recipient,
        subject,
        html,
      })
      await sb.from('email_send_log').insert({
        trigger_key: 'hiring_request_created',
        recipient_email: recipient,
        recipient_role: 'internal',
        subject,
        resend_message_id: result.skipped ? null : result.messageId,
        status: result.skipped ? 'skipped' : 'sent',
        error_message: result.skipped ? 'resend_not_configured' : null,
        metadata: {
          request_id: input.id,
          audience: 'internal',
          workflow: 'hiring_requests',
        },
      })
    } catch (error) {
      await sb.from('email_send_log').insert({
        trigger_key: 'hiring_request_created',
        recipient_email: recipient,
        recipient_role: 'internal',
        subject,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'send_failed',
        metadata: {
          request_id: input.id,
          audience: 'internal',
          workflow: 'hiring_requests',
        },
      })
    }
  }
}

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown'
    await rateLimitOrThrow(`hiring-request:${ip}`, {
      limit: 3,
      windowSeconds: 600,
    })

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

    const insertPayload = {
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
    }

    const { data, error } = await sb
      .from('hiring_requests')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    await notifyInternalTeam(sb, {
      id: data.id,
      ...insertPayload,
    })

    return res.status(201).json({ ok: true, id: data.id })
  } catch (e) {
    if (isRateLimitError(e)) {
      res.setHeader('Retry-After', String(e.retryAfterSeconds))
      return res.status(e.statusCode).json({ error: e.code })
    }
    const msg = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: msg })
  }
}
