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
import {
  handle as handleEmailTemplates,
  handleDuplicate as handleEmailTemplatesDuplicate,
} from '../_handlers/admin/email-templates.js'

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
  'email/templates': handleEmailTemplates,
}

const ADMIN_API_PREFIX = '/api/admin'

function routeKeyFromSegments (
  segments: string | string[] | undefined
): string {
  if (segments == null) return ''
  if (Array.isArray(segments)) return segments.map(String).join('/')
  const value = String(segments)
  if (value.startsWith('[')) return ''
  return value
}

/** Pathname after /api/admin/ — reliable when query.segments is missing on Vercel. */
export function routeKeyFromRequest (req: VercelRequest): string {
  const fromQuery = routeKeyFromSegments(req.query.segments)
  if (fromQuery) return fromQuery

  const pathname = (req.url ?? '').split('?')[0]
  if (!pathname.startsWith(ADMIN_API_PREFIX)) return ''
  return pathname.slice(ADMIN_API_PREFIX.length).replace(/^\//, '')
}

export default async function handler (req: VercelRequest, res: VercelResponse) {
  const key = routeKeyFromRequest(req)
  if (key === 'email/templates/duplicate') {
    return handleEmailTemplatesDuplicate(req, res)
  }
  if (key.startsWith('email/templates/')) {
    return handleEmailTemplates(req, res)
  }
  const routeHandler = ROUTES[key]
  if (!routeHandler) {
    return res.status(404).json({ error: 'not_found' })
  }
  await routeHandler(req, res)
}
