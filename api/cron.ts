import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleListingExpiryReminders } from './_handlers/cron/listing-expiry-reminders.js'
import { handleWeeklyDigest } from './_handlers/cron/weekly-digest.js'

type CronRoute = 'weekly-digest' | 'listing-expiry-reminders'

function cronRoute (req: VercelRequest): CronRoute | null {
  const raw = req.query.route
  const fromQuery = Array.isArray(raw) ? raw[0] : raw
  if (fromQuery === 'weekly-digest' || fromQuery === 'listing-expiry-reminders') {
    return fromQuery
  }

  const pathname = (req.url ?? '').split('?')[0] ?? ''
  if (pathname.includes('listing-expiry-reminders')) {
    return 'listing-expiry-reminders'
  }
  if (pathname.includes('weekly-digest')) {
    return 'weekly-digest'
  }
  return null
}

export default async function handler (req: VercelRequest, res: VercelResponse) {
  const route = cronRoute(req)
  if (route === 'weekly-digest') {
    return handleWeeklyDigest(req, res)
  }
  if (route === 'listing-expiry-reminders') {
    return handleListingExpiryReminders(req, res)
  }
  return res.status(404).json({ error: 'not_found' })
}
