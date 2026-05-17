import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'
import { sendCampaignBatch } from '../../_lib/campaign-send.js'
import { getAdminAllowlistFromServerEnv } from '../../_lib/admin-access.js'

const bodySchema = z.object({
  campaign_id: z.string().uuid(),
  cursor: z.number().int().nonnegative().optional(),
  test_send: z.boolean().optional(),
})

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

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

  const testEmails = parsed.data.test_send
    ? getAdminAllowlistFromServerEnv()
    : undefined

  try {
    const progress = await sendCampaignBatch(
      sbInit.client,
      parsed.data.campaign_id,
      {
        cursor: parsed.data.cursor,
        testEmails: testEmails?.length ? testEmails : undefined,
      }
    )

    const status = progress.done ? 200 : 202
    return res.status(status).json({
      ok: true,
      ...progress,
      next_cursor: progress.done ? null : progress.next_cursor,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'send_failed'
    return res.status(500).json({ error: msg })
  }
}
