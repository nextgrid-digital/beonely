import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../notify-application.js'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('../_lib/rate-limit.js', () => ({
  rateLimitOrThrow: vi.fn(async () => undefined),
  isRateLimitError: vi.fn(() => false),
}))

vi.mock('../_lib/dispatch-transactional-email.js', () => ({
  dispatchTransactionalEmail: mocks.dispatch,
}))

vi.mock('../_lib/supabase.js', () => ({
  getUserFromBearer: mocks.getUser,
  tryGetServiceSupabase: vi.fn(() => ({
    ok: true,
    client: {
      from(table: string) {
        const row =
          table === 'jobs'
            ? {
                id: '36aef6b8-47fc-4d5b-ab65-1d50d6f8f5c0',
                job_title: 'Developer',
                company_name: 'Acme',
                recruiter_id: '2a702ac4-7102-4fe8-97ae-7717e49b29ca',
              }
            : table === 'applications'
              ? { candidate_name: 'Candidate' }
              : { email: 'recruiter@example.com', disabled: false }
        return {
          select() {
            return this
          },
          eq() {
            return this
          },
          order() {
            return this
          },
          limit() {
            return this
          },
          single: vi.fn(async () => ({ data: row, error: null })),
          maybeSingle: vi.fn(async () => ({ data: row, error: null })),
        }
      },
    },
  })),
}))

function response() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(value: unknown) {
      this.body = value
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
  }
  return res as unknown as VercelResponse & {
    statusCode: number
    body: unknown
  }
}

function request(): VercelRequest {
  return {
    method: 'POST',
    headers: {
      authorization: 'Bearer token',
      'x-forwarded-for': '127.0.0.1',
    },
    body: { job_id: '36aef6b8-47fc-4d5b-ab65-1d50d6f8f5c0' },
  } as unknown as VercelRequest
}

describe('notify-application email failures', () => {
  beforeEach(() => {
    mocks.dispatch.mockReset()
    mocks.getUser.mockReset()
    mocks.getUser.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'candidate@example.com',
        email_confirmed_at: '2026-07-11T00:00:00Z',
      },
    })
  })

  it('attempts both messages and surfaces a recruiter dispatch failure', async () => {
    mocks.dispatch
      .mockResolvedValueOnce({ ok: false, error: 'provider_unavailable' })
      .mockResolvedValueOnce({
        ok: true,
        skipped: false,
        messageId: 'email-2',
        logId: 'log-2',
      })
    const res = response()

    await handler(request(), res)

    expect(mocks.dispatch).toHaveBeenCalledTimes(2)
    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({
      error: 'email_dispatch_failed',
      failed_recipients: ['recruiter'],
    })
  })

  it('surfaces a missing Resend configuration as a delivery failure', async () => {
    mocks.dispatch
      .mockResolvedValueOnce({
        ok: true,
        skipped: false,
        messageId: null,
        logId: 'log-1',
        resend_skipped: true,
      })
      .mockResolvedValueOnce({
        ok: true,
        skipped: false,
        messageId: 'email-2',
        logId: 'log-2',
      })
    const res = response()

    await handler(request(), res)

    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({
      error: 'email_dispatch_failed',
      failed_recipients: ['recruiter'],
    })
  })
})
