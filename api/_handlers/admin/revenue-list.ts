import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const PAGE_SIZE = 1_000

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return
  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) return res.status(503).json({ error: sbInit.reason })

  const payments: unknown[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await sbInit.client
      .from('payments')
      .select(
        'id, amount, currency, status, created_at, paid_at, plan, payment_kind, refunded_amount, chargeback_amount, requires_manual_review, risk_status, razorpay_order_id, razorpay_payment_id, jobs(job_title), recruiters(email, company_name)'
      )
      .order('paid_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) return res.status(503).json({ error: 'payments_unavailable' })
    const page = data ?? []
    payments.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ payments })
}
