import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handle as handleCampaigns } from '../_handlers/admin/campaigns.js'
import { handle as handleCampaignSend } from '../_handlers/admin/campaign-send.js'
import { handle as handleCampaignStats } from '../_handlers/admin/campaign-stats.js'
import { handle as handleNotifyJobStatus } from '../_handlers/admin/notify-job-status.js'
import { handle as handleEmailPreviews } from '../_handlers/admin/email-previews.js'
import { handle as handleEmailAutomations } from '../_handlers/admin/email-automations.js'
import { handle as handleEmailTestSend } from '../_handlers/admin/email-test-send.js'
import { handle as handleEmailAnalytics } from '../_handlers/admin/email-analytics.js'
import { handle as handleEmailCampaignRecipients } from '../_handlers/admin/email-campaign-recipients.js'

type AdminRouteHandler = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<unknown>

const ROUTES: Record<string, AdminRouteHandler> = {
  campaigns: handleCampaigns,
  'campaign-send': handleCampaignSend,
  'campaign-stats': handleCampaignStats,
  'notify-job-status': handleNotifyJobStatus,
  'email-previews': handleEmailPreviews,
  'email/automations': handleEmailAutomations,
  'email/test-send': handleEmailTestSend,
  'email/analytics': handleEmailAnalytics,
  'email/campaign-recipients': handleEmailCampaignRecipients,
}

function routeKeyFromSegments(
  segments: string | string[] | undefined
): string {
  if (segments == null) return ''
  if (Array.isArray(segments)) return segments.map(String).join('/')
  return String(segments)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = routeKeyFromSegments(req.query.segments)
  const routeHandler = ROUTES[key]
  if (!routeHandler) {
    return res.status(404).json({ error: 'not_found' })
  }
  await routeHandler(req, res)
}
