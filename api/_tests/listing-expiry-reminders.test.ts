import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleListingExpiryReminders } from '../_handlers/cron/listing-expiry-reminders.js'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  from: vi.fn(),
}))

vi.mock('../_lib/cron-auth.js', () => ({
  requireCronAuthorization: vi.fn(() => true),
}))

vi.mock('../_lib/dispatch-transactional-email.js', () => ({
  dispatchTransactionalEmail: mocks.dispatch,
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

function jobsQuery(jobs: unknown[]) {
  return {
    select() {
      return this
    },
    eq() {
      return this
    },
    not() {
      return this
    },
    gt: vi.fn(async () => ({ data: jobs, error: null })),
  }
}

function recruiterQuery(recruiter: unknown) {
  return {
    select() {
      return this
    },
    eq() {
      return this
    },
    maybeSingle: vi.fn(async () => ({ data: recruiter, error: null })),
  }
}

describe('listing expiry reminder delivery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T12:00:00Z'))
    mocks.dispatch.mockReset()
    mocks.from.mockReset()
    mocks.dispatch.mockResolvedValue({
      ok: true,
      skipped: false,
      messageId: 'email-1',
      logId: 'log-1',
    })

    mocks.from.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return jobsQuery([
          {
            id: 'job-1',
            job_title: 'Platform Engineer',
            company_name: 'Acme',
            listing_expires_at: '2026-07-18T23:00:00Z',
            recruiter_id: 'recruiter-1',
          },
        ])
      }
      if (table === 'recruiters') {
        return recruiterQuery({
          email: ' Recruiter@Example.com ',
          disabled: false,
        })
      }
      throw new Error(`unexpected_table:${table}`)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the atomic dispatcher with a stable per-window dedupe key', async () => {
    const res = response()

    await handleListingExpiryReminders(
      { method: 'GET', headers: {} } as unknown as VercelRequest,
      res
    )

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      sent: 1,
      skipped: 0,
      failed: 0,
    })
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.anything(), {
      trigger_key: 'listing_expiry_reminder',
      to: 'Recruiter@Example.com',
      recipient_role: 'recruiter',
      payload: {
        job_title: 'Platform Engineer',
        company_name: 'Acme',
        days_remaining: 7,
      },
      dedupe_key: 'listing_expiry:job-1:7d',
      metadata: { job_id: 'job-1', days_left: 7 },
    })
    expect(mocks.from).not.toHaveBeenCalledWith('email_send_log')
  })

  it('returns a retryable error when delivery infrastructure fails', async () => {
    mocks.dispatch.mockResolvedValue({
      ok: false,
      error: 'delivery_claim_failed',
    })
    const res = response()

    await handleListingExpiryReminders(
      { method: 'POST', headers: {} } as unknown as VercelRequest,
      res
    )

    expect(res.statusCode).toBe(503)
    expect(res.body).toMatchObject({ ok: false, failed: 1 })
  })
})
