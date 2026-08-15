import type { SupabaseClient } from '@supabase/supabase-js'

export type EmailDeliveryClaim =
  | {
      claimed: true
      logId: string
      claimToken: string
      attemptCount: number
    }
  | { claimed: false; reason: 'dedupe' | 'in_progress' }

type ClaimRpcResult = {
  claimed?: boolean
  reason?: string
  log_id?: string
  claim_token?: string
  attempt_count?: number
}

export async function claimEmailDelivery(
  sb: SupabaseClient,
  opts: {
    triggerKey: string
    recipientEmail: string
    recipientRole: string
    subject: string
    dedupeKey: string
    metadata?: Record<string, unknown>
    staleAfterSeconds?: number
  }
): Promise<EmailDeliveryClaim> {
  const { data, error } = await sb.rpc('claim_transactional_email', {
    p_trigger_key: opts.triggerKey,
    p_recipient_email: opts.recipientEmail,
    p_recipient_role: opts.recipientRole,
    p_subject: opts.subject,
    p_dedupe_key: opts.dedupeKey,
    p_metadata: opts.metadata ?? {},
    p_stale_after_seconds: opts.staleAfterSeconds ?? 600,
  })
  if (error) {
    throw new Error(`delivery_claim_failed: ${error.message}`)
  }

  const claim = data as ClaimRpcResult | null
  if (!claim?.claimed) {
    return {
      claimed: false,
      reason: claim?.reason === 'in_progress' ? 'in_progress' : 'dedupe',
    }
  }
  if (!claim.log_id || !claim.claim_token) {
    throw new Error('delivery_claim_invalid')
  }

  return {
    claimed: true,
    logId: claim.log_id,
    claimToken: claim.claim_token,
    attemptCount: claim.attempt_count ?? 1,
  }
}

export async function finishEmailDelivery(
  sb: SupabaseClient,
  opts: {
    logId: string
    claimToken: string
    status: 'sent' | 'failed' | 'skipped'
    messageId?: string | null
    errorMessage?: string | null
  }
): Promise<void> {
  const { data, error } = await sb.rpc('finish_transactional_email', {
    p_log_id: opts.logId,
    p_claim_token: opts.claimToken,
    p_status: opts.status,
    p_resend_message_id: opts.messageId ?? null,
    p_error_message: opts.errorMessage ?? null,
  })
  if (error || data !== true) {
    throw new Error(
      `delivery_finalize_failed${error?.message ? `: ${error.message}` : ''}`
    )
  }
}
