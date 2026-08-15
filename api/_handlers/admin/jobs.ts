import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), job_id: z.string().uuid() }),
  z.object({
    action: z.literal('reject'),
    job_id: z.string().uuid(),
    reason: z.string().trim().max(2_000).optional().nullable(),
  }),
  z.object({
    action: z.literal('set_featured'),
    job_id: z.string().uuid(),
    featured: z.boolean(),
  }),
  z.object({
    action: z.literal('update_description'),
    job_id: z.string().uuid(),
    description: z.string().min(1).max(200_000),
  }),
])

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  const bodyRead = readJsonObjectBody(req)
  if (!bodyRead.ok) return res.status(400).json({ error: 'invalid_json' })
  const parsed = actionSchema.safeParse(bodyRead.value)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' })

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) return res.status(503).json({ error: sbInit.reason })
  const sb = sbInit.client
  const input = parsed.data
  const { data: job, error: loadError } = await sb
    .from('jobs')
    .select('*')
    .eq('id', input.job_id)
    .maybeSingle()
  if (loadError) return res.status(503).json({ error: 'job_lookup_failed' })
  if (!job) return res.status(404).json({ error: 'job_not_found' })

  const now = new Date()
  let patch: Record<string, unknown>
  if (input.action === 'approve') {
    const payable =
      job.payment_status === 'paid' || job.source_kind === 'linkedin_import'
    if (job.approval_status !== 'pending' || !payable) {
      return res.status(409).json({ error: 'job_not_approvable' })
    }
    const expires = new Date(now)
    expires.setUTCDate(
      expires.getUTCDate() + (job.listing_duration === 'monthly' ? 30 : 7)
    )
    patch = {
      approval_status: 'approved',
      listing_expires_at: expires.toISOString(),
      featured_expiry: job.featured ? expires.toISOString() : null,
    }
  } else if (input.action === 'reject') {
    if (job.approval_status === 'rejected') {
      return res.status(409).json({ error: 'job_already_rejected' })
    }
    const { data: openCheckout, error: checkoutError } = await sb
      .from('payments')
      .select('id')
      .eq('job_id', job.id)
      .eq('status', 'unpaid')
      .gt('checkout_expires_at', now.toISOString())
      .limit(1)
      .maybeSingle()
    if (checkoutError) {
      return res.status(503).json({ error: 'payment_lookup_failed' })
    }
    if (openCheckout) {
      return res.status(409).json({ error: 'job_has_outstanding_payment' })
    }
    patch = { approval_status: 'rejected' }
  } else if (input.action === 'set_featured') {
    if (
      job.approval_status !== 'approved' ||
      job.payment_status !== 'paid' ||
      (job.listing_expires_at && new Date(job.listing_expires_at) <= now)
    ) {
      return res.status(409).json({ error: 'job_not_featureable' })
    }
    patch = {
      featured: input.featured,
      featured_expiry: input.featured ? job.listing_expires_at : null,
    }
  } else {
    patch = { job_description: input.description }
  }

  const { data: updated, error: updateError } = await sb
    .from('jobs')
    .update(patch)
    .eq('id', job.id)
    .eq('updated_at', job.updated_at)
    .select('*')
    .maybeSingle()
  if (updateError) {
    if (updateError.message?.includes('job_has_outstanding_payment_order')) {
      return res.status(409).json({ error: 'job_has_outstanding_payment' })
    }
    return res.status(503).json({ error: 'job_update_failed' })
  }
  if (!updated) return res.status(409).json({ error: 'job_changed_retry' })

  await sb.from('admin_audit_log').insert({
    actor_user_id: admin.id,
    actor_email: admin.email ?? '',
    action: `job.${input.action}`,
    target_type: 'job',
    target_id: job.id,
    metadata: {
      before: {
        approval_status: job.approval_status,
        featured: job.featured,
        updated_at: job.updated_at,
      },
      after: patch,
      ...(input.action === 'reject' ? { reason: input.reason ?? null } : {}),
    },
  })

  return res.status(200).json({ job: updated })
}
