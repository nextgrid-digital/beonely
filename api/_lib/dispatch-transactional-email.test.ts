import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dispatchTransactionalEmail } from './dispatch-transactional-email.js'

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  finish: vi.fn(),
  send: vi.fn(),
}))

vi.mock('./email-delivery-claim.js', () => ({
  claimEmailDelivery: mocks.claim,
  finishEmailDelivery: mocks.finish,
}))

vi.mock('./resend.js', () => ({
  sendTransactionalEmail: mocks.send,
}))

const sb = {} as SupabaseClient

describe('dispatchTransactionalEmail', () => {
  beforeEach(() => {
    mocks.claim.mockReset()
    mocks.finish.mockReset()
    mocks.send.mockReset()
    mocks.claim.mockResolvedValue({
      claimed: true,
      logId: '58a709ec-ab6a-402b-8bf0-acfb5c70f56f',
      claimToken: '16228a37-f126-4702-8657-55d9f31695ca',
      attemptCount: 1,
    })
    mocks.finish.mockResolvedValue(undefined)
    mocks.send.mockResolvedValue({ skipped: false, messageId: 'email_123' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('claims before sending and uses a stable provider idempotency key', async () => {
    const result = await dispatchTransactionalEmail(sb, {
      trigger_key: 'candidate_signup',
      to: ' User@Example.com ',
      recipient_role: 'candidate',
      payload: { name: 'User' },
      dedupe_key: 'candidate_signup:user-1',
      bypass_automation_rule: true,
    })

    expect(result).toMatchObject({
      ok: true,
      skipped: false,
      messageId: 'email_123',
      logId: '58a709ec-ab6a-402b-8bf0-acfb5c70f56f',
    })
    expect(mocks.claim).toHaveBeenCalledWith(
      sb,
      expect.objectContaining({
        recipientEmail: 'user@example.com',
        dedupeKey: 'candidate_signup:user-1',
      })
    )
    expect(mocks.claim.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.send.mock.invocationCallOrder[0]
    )
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'transactional/58a709ec-ab6a-402b-8bf0-acfb5c70f56f',
      })
    )
    expect(mocks.finish).toHaveBeenCalledWith(
      sb,
      expect.objectContaining({ status: 'sent', messageId: 'email_123' })
    )
  })

  it('does not contact the provider when another worker owns the claim', async () => {
    mocks.claim.mockResolvedValue({ claimed: false, reason: 'in_progress' })

    const result = await dispatchTransactionalEmail(sb, {
      trigger_key: 'candidate_signup',
      to: 'user@example.com',
      recipient_role: 'candidate',
      payload: { name: 'User' },
      dedupe_key: 'candidate_signup:user-1',
      bypass_automation_rule: true,
    })

    expect(result).toEqual({
      ok: true,
      skipped: true,
      reason: 'in_progress',
    })
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('finishes a failed retry claim as failed so it can be claimed again', async () => {
    mocks.claim.mockResolvedValue({
      claimed: true,
      logId: '58a709ec-ab6a-402b-8bf0-acfb5c70f56f',
      claimToken: '16228a37-f126-4702-8657-55d9f31695ca',
      attemptCount: 2,
    })
    mocks.send.mockRejectedValue(new Error('provider_unavailable'))

    const result = await dispatchTransactionalEmail(sb, {
      trigger_key: 'candidate_signup',
      to: 'user@example.com',
      recipient_role: 'candidate',
      payload: { name: 'User' },
      dedupe_key: 'candidate_signup:user-1',
      bypass_automation_rule: true,
    })

    expect(result).toEqual({ ok: false, error: 'provider_unavailable' })
    expect(mocks.finish).toHaveBeenCalledWith(
      sb,
      expect.objectContaining({
        status: 'failed',
        errorMessage: 'provider_unavailable',
      })
    )
  })

  it('renders listing reminders with the validated shared site origin', async () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'https://jobs.example.test/a/path')

    const result = await dispatchTransactionalEmail(sb, {
      trigger_key: 'listing_expiry_reminder',
      to: 'recruiter@example.com',
      recipient_role: 'recruiter',
      payload: {
        job_title: 'Platform Engineer',
        company_name: 'Acme',
        days_remaining: 3,
      },
      dedupe_key: 'listing_expiry:job-1:3d',
      bypass_automation_rule: true,
    })

    expect(result.ok).toBe(true)
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('3 days'),
        html: expect.stringContaining('https://jobs.example.test/recruiter'),
      })
    )
  })
})
