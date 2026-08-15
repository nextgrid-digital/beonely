import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendCampaignBatch } from './campaign-send.js'

const mocks = vi.hoisted(() => ({
  sendMarketingEmail: vi.fn(),
}))

vi.mock('./resend.js', () => ({
  CAMPAIGN_BATCH_SIZE: 50,
  sendMarketingEmail: mocks.sendMarketingEmail,
}))

describe('campaign test delivery', () => {
  beforeEach(() => {
    mocks.sendMarketingEmail.mockReset()
    mocks.sendMarketingEmail.mockResolvedValue({
      skipped: false,
      messageId: 'email-test-1',
    })
  })

  it('never queries, creates, or reactivates a subscriber for a test send', async () => {
    const from = vi.fn((table: string) => {
      if (table !== 'email_campaigns') {
        throw new Error(`unexpected_table:${table}`)
      }
      return {
        select() {
          return this
        },
        eq() {
          return this
        },
        single: vi.fn(async () => ({
          data: {
            id: 'd4d17686-3b13-49a5-a52f-985d9102fb88',
            subject: 'New roles',
            preview_text: 'Preview',
            body: '<p>Body</p>',
            audience: 'candidates',
            status: 'draft',
          },
          error: null,
        })),
      }
    })

    const result = await sendCampaignBatch(
      { from } as unknown as SupabaseClient,
      'd4d17686-3b13-49a5-a52f-985d9102fb88',
      { testEmails: [' ADMIN@EXAMPLE.COM '] }
    )

    expect(result).toMatchObject({ sent: 1, failed: 0, total: 1, done: true })
    expect(from).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledWith('email_campaigns')
    expect(mocks.sendMarketingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@example.com',
        html: expect.stringContaining('https://beonely.in/unsubscribe'),
      })
    )
    expect(mocks.sendMarketingEmail).toHaveBeenCalledWith(
      expect.not.objectContaining({ idempotencyKey: expect.anything() })
    )
  })
})
