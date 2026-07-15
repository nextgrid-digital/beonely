import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  claimEmailDelivery,
  finishEmailDelivery,
} from './email-delivery-claim.js'

describe('email delivery claims', () => {
  it('passes stale-claim recovery and metadata to the atomic RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        claimed: true,
        log_id: 'log-1',
        claim_token: 'token-1',
        attempt_count: 2,
      },
      error: null,
    }))

    const result = await claimEmailDelivery(
      { rpc } as unknown as SupabaseClient,
      {
        triggerKey: 'candidate_signup',
        recipientEmail: 'user@example.com',
        recipientRole: 'candidate',
        subject: 'Welcome',
        dedupeKey: 'candidate_signup:user-1',
        metadata: { source: 'signup' },
        staleAfterSeconds: 900,
      }
    )

    expect(result).toEqual({
      claimed: true,
      logId: 'log-1',
      claimToken: 'token-1',
      attemptCount: 2,
    })
    expect(rpc).toHaveBeenCalledWith(
      'claim_transactional_email',
      expect.objectContaining({
        p_dedupe_key: 'candidate_signup:user-1',
        p_stale_after_seconds: 900,
      })
    )
  })

  it('rejects a completion when the fencing token no longer owns the row', async () => {
    const rpc = vi.fn(async () => ({ data: false, error: null }))

    await expect(
      finishEmailDelivery({ rpc } as unknown as SupabaseClient, {
        logId: 'log-1',
        claimToken: 'stale-token',
        status: 'sent',
        messageId: 'email-1',
      })
    ).rejects.toThrow('delivery_finalize_failed')
  })
})
