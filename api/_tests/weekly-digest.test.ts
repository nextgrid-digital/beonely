import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleWeeklyDigest } from '../_handlers/cron/weekly-digest.js'

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  finish: vi.fn(),
  from: vi.fn(),
  resolve: vi.fn(),
  send: vi.fn(),
}))

vi.mock('../_lib/cron-auth.js', () => ({
  requireCronAuthorization: vi.fn(() => true),
}))

vi.mock('../_lib/email-delivery-claim.js', () => ({
  claimEmailDelivery: mocks.claim,
  finishEmailDelivery: mocks.finish,
}))

vi.mock('../_lib/resolve-campaign-audience.js', () => ({
  resolveCampaignAudience: mocks.resolve,
}))

vi.mock('../_lib/resend.js', () => ({
  sendMarketingEmail: mocks.send,
}))

vi.mock('../_lib/supabase.js', () => ({
  tryGetServiceSupabase: vi.fn(() => ({
    ok: true,
    client: { from: mocks.from },
  })),
}))

function response() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(value: unknown) {
      this.body = value
      return this
    },
  }
  return res as unknown as VercelResponse & {
    statusCode: number
    body: Record<string, unknown>
  }
}

function chain(result: { data: unknown; error: unknown }) {
  return {
    select() {
      return this
    },
    eq() {
      return this
    },
    gte() {
      return this
    },
    filter() {
      return this
    },
    order() {
      return this
    },
    limit: vi.fn(async () => result),
    range: vi.fn(async () => result),
  }
}

describe('weekly digest batching', () => {
  beforeEach(() => {
    mocks.claim.mockReset()
    mocks.finish.mockReset()
    mocks.from.mockReset()
    mocks.resolve.mockReset()
    mocks.send.mockReset()

    const jobs = [
      {
        job_title: 'Developer',
        job_slug: 'developer-acme',
        company_name: 'Acme',
        created_at: '2026-07-11T00:00:00Z',
      },
    ]
    mocks.from.mockImplementation((table: string) => {
      if (table === 'jobs' || table === 'public_jobs') {
        return chain({ data: jobs, error: null })
      }
      if (table === 'email_send_log') {
        return chain({ data: [], error: null })
      }
      throw new Error(`unexpected_table:${table}`)
    })
    mocks.resolve.mockResolvedValue(
      Array.from({ length: 51 }, (_, index) => ({
        email: `candidate-${index}@example.com`,
        recipient_type: 'candidate',
        unsubscribe_token: `token-${index}`,
      }))
    )
    mocks.claim.mockImplementation(
      async (_sb: unknown, opts: { recipientEmail: string }) => ({
        claimed: true,
        logId: `log-${opts.recipientEmail}`,
        claimToken: `claim-${opts.recipientEmail}`,
        attemptCount: 1,
      })
    )
    mocks.finish.mockResolvedValue(undefined)
    mocks.send.mockResolvedValue({ skipped: false, messageId: 'email-1' })
  })

  it('sends one resumable bounded batch using resolved unsubscribe tokens', async () => {
    const res = response()

    await handleWeeklyDigest(
      { method: 'GET', headers: {} } as unknown as VercelRequest,
      res
    )

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      processed: 50,
      batch_size: 50,
      recipients: 51,
      resumable: true,
    })
    expect(mocks.send).toHaveBeenCalledTimes(50)
    expect(mocks.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        html: expect.stringContaining('unsubscribe?token=token-0'),
        idempotencyKey: 'weekly/log-candidate-0@example.com',
      })
    )
    expect(mocks.from).not.toHaveBeenCalledWith('email_subscribers')
  })
})
