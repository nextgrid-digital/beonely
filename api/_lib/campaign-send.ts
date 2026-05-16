import type { SupabaseClient } from '@supabase/supabase-js'
import { marketingCampaignEmail } from './email-templates.js'
import {
  CAMPAIGN_BATCH_SIZE,
  sendMarketingEmail,
} from './resend.js'
import {
  resolveCampaignAudience,
  type CampaignAudience,
  type ResolvedRecipient,
} from './resolve-campaign-audience.js'
import { syncSubscriberForMarketingOptIn } from './marketing-consent.js'

function siteOrigin(): string {
  const raw = process.env.VITE_PUBLIC_SITE_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return 'https://beonely.vercel.app'
}

async function ensureUnsubscribeToken(
  sb: SupabaseClient,
  email: string
): Promise<string> {
  const normalized = email.trim().toLowerCase()
  const { data } = await sb
    .from('email_subscribers')
    .select('unsubscribe_token')
    .eq('email', normalized)
    .maybeSingle()
  if (data?.unsubscribe_token) return data.unsubscribe_token as string

  const { data: inserted } = await sb
    .from('email_subscribers')
    .insert({
      email: normalized,
      audience: 'newsletter',
      source: 'campaign_send',
    })
    .select('unsubscribe_token')
    .single()
  return (inserted?.unsubscribe_token as string) ?? crypto.randomUUID()
}

export type CampaignSendProgress = {
  sent: number
  failed: number
  total: number
  done: boolean
  next_cursor: number
}

export async function sendCampaignBatch(
  sb: SupabaseClient,
  campaignId: string,
  opts?: { cursor?: number; testEmails?: string[] }
): Promise<CampaignSendProgress> {
  const { data: campaign, error: campErr } = await sb
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()
  if (campErr || !campaign) throw new Error('campaign_not_found')

  let recipients: ResolvedRecipient[]
  if (opts?.testEmails?.length) {
    recipients = opts.testEmails.map((email) => ({
      email: email.trim().toLowerCase(),
      recipient_type: 'test',
      unsubscribe_token: null,
    }))
  } else {
    recipients = await resolveCampaignAudience(
      sb,
      campaign.audience as CampaignAudience
    )
  }

  const total = recipients.length
  const cursor = opts?.cursor ?? 0
  const batch = recipients.slice(cursor, cursor + CAMPAIGN_BATCH_SIZE)
  const origin = siteOrigin()

  if (cursor === 0 && !opts?.testEmails?.length) {
    await sb
      .from('email_campaigns')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', campaignId)

    if (recipients.length > 0) {
      await sb.from('email_campaign_recipients').insert(
        recipients.map((r) => ({
          campaign_id: campaignId,
          email: r.email,
          recipient_type: r.recipient_type,
          delivery_status: 'pending' as const,
        }))
      )
    }
  }

  let sent = 0
  let failed = 0

  for (const r of batch) {
    try {
      const token =
        r.unsubscribe_token ?? (await ensureUnsubscribeToken(sb, r.email))
      const unsubscribeUrl = `${origin}/unsubscribe?token=${encodeURIComponent(token)}`
      const { subject, html } = marketingCampaignEmail({
        subject: campaign.subject,
        previewText: campaign.preview_text,
        bodyHtml: campaign.body,
        unsubscribeUrl,
      })
      const result = await sendMarketingEmail({
        to: r.email,
        subject,
        html,
        audienceHint: r.recipient_type,
      })
      if (result.skipped) {
        failed += 1
        await sb
          .from('email_campaign_recipients')
          .update({
            delivery_status: 'failed',
            error_message: 'resend_not_configured',
          })
          .eq('campaign_id', campaignId)
          .eq('email', r.email)
      } else {
        sent += 1
        await sb
          .from('email_campaign_recipients')
          .update({
            delivery_status: 'sent',
            sent_at: new Date().toISOString(),
            resend_message_id: result.messageId,
            error_message: null,
          })
          .eq('campaign_id', campaignId)
          .eq('email', r.email)
      }
    } catch (e) {
      failed += 1
      const msg = e instanceof Error ? e.message : 'send_failed'
      await sb
        .from('email_campaign_recipients')
        .update({
          delivery_status: 'failed',
          error_message: msg,
        })
        .eq('campaign_id', campaignId)
        .eq('email', r.email)
    }
  }

  const nextCursor = cursor + batch.length
  const done = nextCursor >= total

  if (done && !opts?.testEmails?.length) {
    const finalStatus = failed > 0 && sent === 0 ? 'failed' : 'sent'
    await sb
      .from('email_campaigns')
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
  }

  return { sent, failed, total, done, next_cursor: nextCursor }
}

export async function syncProfileMarketingOptIn(
  sb: SupabaseClient,
  opts: {
    email: string
    audience: 'candidate' | 'recruiter'
    optIn: boolean
  }
): Promise<void> {
  const now = new Date().toISOString()
  if (opts.audience === 'candidate') {
    await sb
      .from('job_seeker_profiles')
      .update({
        marketing_opt_in: opts.optIn,
        marketing_opt_in_at: opts.optIn ? now : null,
      })
      .eq('email', opts.email.trim().toLowerCase())
  } else {
    await sb
      .from('recruiters')
      .update({
        marketing_opt_in: opts.optIn,
        marketing_opt_in_at: opts.optIn ? now : null,
      })
      .eq('email', opts.email.trim().toLowerCase())
  }
  await syncSubscriberForMarketingOptIn(sb, {
    email: opts.email,
    audience: opts.audience,
    optIn: opts.optIn,
    source: 'profile',
  })
}
