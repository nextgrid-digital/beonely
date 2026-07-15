import type { SupabaseClient } from '@supabase/supabase-js'
import { marketingCampaignEmail } from './email-templates.js'
import { syncSubscriberForMarketingOptIn } from './marketing-consent.js'
import { CAMPAIGN_BATCH_SIZE, sendMarketingEmail } from './resend.js'
import {
  resolveCampaignAudience,
  type CampaignAudience,
  type ResolvedRecipient,
} from './resolve-campaign-audience.js'
import { serverSiteOrigin } from './site-origin.js'

async function unsubscribeToken(
  sb: SupabaseClient,
  email: string
): Promise<string> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await sb
    .from('email_subscribers')
    .select('unsubscribe_token, unsubscribed_at')
    .eq('email', normalized)
    .maybeSingle()
  if (error) throw new Error(`suppression_lookup_failed: ${error.message}`)
  if (data?.unsubscribed_at) throw new Error('recipient_unsubscribed')
  if (data?.unsubscribe_token) return data.unsubscribe_token as string

  const { data: inserted, error: insertError } = await sb
    .from('email_subscribers')
    .insert({
      email: normalized,
      audience: 'newsletter',
      source: 'campaign_send',
    })
    .select('unsubscribe_token')
    .single()
  if (insertError || !inserted?.unsubscribe_token) {
    throw new Error('unsubscribe_token_failed')
  }
  return inserted.unsubscribe_token as string
}

export type CampaignSendProgress = {
  sent: number
  failed: number
  total: number
  done: boolean
  next_cursor: number
}

type SnapshotRecipient = {
  id: string
  email: string
  recipient_type: string
  delivery_status: string
}

async function snapshotCampaignAudience(
  sb: SupabaseClient,
  campaignId: string,
  audience: CampaignAudience
): Promise<void> {
  const recipients = await resolveCampaignAudience(sb, audience)
  for (let offset = 0; offset < recipients.length; offset += 500) {
    const chunk = recipients.slice(offset, offset + 500)
    const { error } = await sb.from('email_campaign_recipients').upsert(
      chunk.map((recipient) => ({
        campaign_id: campaignId,
        email: recipient.email,
        recipient_type: recipient.recipient_type,
        delivery_status: 'pending' as const,
      })),
      { onConflict: 'campaign_id,email', ignoreDuplicates: true }
    )
    if (error) throw new Error(`recipient_snapshot_failed: ${error.message}`)
  }
  const { error } = await sb
    .from('email_campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .eq('status', 'draft')
  if (error) throw new Error(`campaign_state_failed: ${error.message}`)
}

export async function sendCampaignBatch(
  sb: SupabaseClient,
  campaignId: string,
  opts?: { cursor?: number; testEmails?: string[] }
): Promise<CampaignSendProgress> {
  const { data: campaign, error: campaignError } = await sb
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()
  if (campaignError || !campaign) throw new Error('campaign_not_found')

  const testRecipients: ResolvedRecipient[] | null = opts?.testEmails?.length
    ? opts.testEmails.map((email) => ({
        email: email.trim().toLowerCase(),
        recipient_type: 'test',
        unsubscribe_token: null,
      }))
    : null

  if (!testRecipients && campaign.status === 'sent') {
    const { count } = await sb
      .from('email_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
    return {
      sent: 0,
      failed: 0,
      total: count ?? 0,
      done: true,
      next_cursor: count ?? 0,
    }
  }

  if (!testRecipients && campaign.status === 'draft') {
    await snapshotCampaignAudience(
      sb,
      campaignId,
      campaign.audience as CampaignAudience
    )
  }

  const cursor = opts?.cursor ?? 0
  let batch: SnapshotRecipient[]
  let total: number
  if (testRecipients) {
    batch = testRecipients.map((recipient, index) => ({
      id: `test-${index}`,
      email: recipient.email,
      recipient_type: recipient.recipient_type,
      delivery_status: 'pending',
    }))
    total = batch.length
  } else {
    const { count, error: countError } = await sb
      .from('email_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
    if (countError)
      throw new Error(`recipient_count_failed: ${countError.message}`)
    total = count ?? 0
    const { data, error } = await sb
      .from('email_campaign_recipients')
      .select('id, email, recipient_type, delivery_status')
      .eq('campaign_id', campaignId)
      .order('id', { ascending: true })
      .range(cursor, cursor + CAMPAIGN_BATCH_SIZE - 1)
    if (error) throw new Error(`recipient_batch_failed: ${error.message}`)
    batch = (data ?? []) as SnapshotRecipient[]
  }

  let sent = 0
  let failed = 0
  const origin = serverSiteOrigin()
  for (const recipient of batch) {
    if (!testRecipients && recipient.delivery_status === 'sent') continue
    try {
      const unsubscribeUrl = testRecipients
        ? `${origin}/unsubscribe`
        : `${origin}/unsubscribe?token=${encodeURIComponent(
            await unsubscribeToken(sb, recipient.email)
          )}`
      const email = marketingCampaignEmail({
        subject: campaign.subject,
        previewText: campaign.preview_text,
        bodyHtml: campaign.body,
        unsubscribeUrl,
      })
      const result = await sendMarketingEmail({
        to: recipient.email,
        subject: email.subject,
        html: email.html,
        audienceHint: recipient.recipient_type,
        ...(testRecipients
          ? {}
          : { idempotencyKey: `campaign/${campaignId}/${recipient.id}` }),
      })
      if (result.skipped) throw new Error('resend_not_configured')
      sent += 1
      if (!testRecipients) {
        const { error } = await sb
          .from('email_campaign_recipients')
          .update({
            delivery_status: 'sent',
            sent_at: new Date().toISOString(),
            resend_message_id: result.messageId,
            error_message: null,
          })
          .eq('id', recipient.id)
        if (error) throw new Error(`recipient_update_failed: ${error.message}`)
      }
    } catch (error) {
      failed += 1
      if (!testRecipients) {
        const { error: updateError } = await sb
          .from('email_campaign_recipients')
          .update({
            delivery_status: 'failed',
            error_message:
              error instanceof Error
                ? error.message.slice(0, 500)
                : 'send_failed',
          })
          .eq('id', recipient.id)
        if (updateError) {
          throw new Error(`recipient_update_failed: ${updateError.message}`, {
            cause: error,
          })
        }
      }
    }
  }

  const nextCursor = cursor + batch.length
  const done = nextCursor >= total || batch.length === 0
  if (done && !testRecipients) {
    const { count: failedCount, error: failedCountError } = await sb
      .from('email_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('delivery_status', 'failed')
    if (failedCountError) {
      throw new Error(`recipient_count_failed: ${failedCountError.message}`)
    }
    const { error: statusError } = await sb
      .from('email_campaigns')
      .update({
        status: (failedCount ?? 0) > 0 ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
    if (statusError) {
      throw new Error(`campaign_state_failed: ${statusError.message}`)
    }
  }

  return { sent, failed, total, done, next_cursor: nextCursor }
}

export async function syncProfileMarketingOptIn(
  sb: SupabaseClient,
  opts: {
    email: string
    userId: string
    audience: 'candidate' | 'recruiter'
    optIn: boolean
  }
): Promise<void> {
  const now = new Date().toISOString()
  const table =
    opts.audience === 'candidate' ? 'job_seeker_profiles' : 'recruiters'
  const { data: updated, error } = await sb
    .from(table)
    .update({
      marketing_opt_in: opts.optIn,
      marketing_opt_in_at: opts.optIn ? now : null,
    })
    .eq('user_id', opts.userId)
    .select('id')
    .maybeSingle()
  if (error) throw new Error(`marketing_consent_failed: ${error.message}`)
  if (!updated) throw new Error('marketing_profile_not_found')

  await syncSubscriberForMarketingOptIn(sb, {
    email: opts.email,
    audience: opts.audience,
    optIn: opts.optIn,
    source: 'profile',
  })
}
