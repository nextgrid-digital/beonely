import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handle as handleEmailAutomations } from '../../_handlers/admin/email-automations.js'
import { handle as handleEmailTestSend } from '../../_handlers/admin/email-test-send.js'
import { handle as handleEmailAnalytics } from '../../_handlers/admin/email-analytics.js'
import { handle as handleEmailCampaignRecipients } from '../../_handlers/admin/email-campaign-recipients.js'

type EmailAdminRouteHandler = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<unknown>

const ROUTES: Record<string, EmailAdminRouteHandler> = {
  automations: handleEmailAutomations,
  'test-send': handleEmailTestSend,
  analytics: handleEmailAnalytics,
  'campaign-recipients': handleEmailCampaignRecipients,
}

const EMAIL_ADMIN_PREFIX = '/api/admin/email'

function routeKeyFromSegments(
  segments: string | string[] | undefined
): string {
  if (segments == null) return ''
  if (Array.isArray(segments)) return segments.map(String).join('/')
  const value = String(segments)
  if (value.startsWith('[')) return ''
  return value
}

export function routeKeyFromRequest(req: VercelRequest): string {
  const fromQuery = routeKeyFromSegments(req.query.segments)
  if (fromQuery) return fromQuery

  const pathname = (req.url ?? '').split('?')[0]
  if (!pathname.startsWith(EMAIL_ADMIN_PREFIX)) return ''
  return pathname.slice(EMAIL_ADMIN_PREFIX.length).replace(/^\//, '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = routeKeyFromRequest(req)
  const routeHandler = ROUTES[key]
  if (!routeHandler) {
    return res.status(404).json({ error: 'not_found' })
  }
  await routeHandler(req, res)
}
