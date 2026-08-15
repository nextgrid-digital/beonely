import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../email/dispatch.js'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  getUser: vi.fn(),
  profileResult: {
    data: { full_name: 'Real Candidate' } as {
      full_name: string | null
    } | null,
    error: null as unknown,
  },
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
      from: vi.fn(() => ({
        select() {
          return this
        },
        eq() {
          return this
        },
        maybeSingle: vi.fn(async () => mocks.profileResult),
      })),
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

describe('email dispatch security boundary', () => {
  beforeEach(() => {
    mocks.dispatch.mockReset()
    mocks.dispatch.mockResolvedValue({ ok: true })
    mocks.getUser.mockReset()
    mocks.profileResult = {
      data: { full_name: 'Real Candidate' },
      error: null,
    }
  })

  it('rejects unauthenticated mail dispatch', async () => {
    mocks.getUser.mockResolvedValue({ user: null })
    const res = response()

    await handler(
      {
        method: 'POST',
        headers: {},
        body: {
          trigger_key: 'candidate_signup',
          to: 'victim@example.com',
        },
      } as unknown as VercelRequest,
      res
    )

    expect(res.statusCode).toBe(401)
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('derives the recipient and payload instead of trusting caller fields', async () => {
    mocks.getUser.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        email_confirmed_at: '2026-07-10T00:00:00Z',
        user_metadata: { full_name: 'Forged Name' },
      },
    })
    const res = response()

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer valid' },
        body: {
          trigger_key: 'candidate_signup',
          to: 'victim@example.com',
          payload: { name: '<script>forged</script>' },
        },
      } as unknown as VercelRequest,
      res
    )

    expect(res.statusCode).toBe(200)
    expect(mocks.dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        trigger_key: 'candidate_signup',
        to: 'owner@example.com',
        payload: { name: 'Real Candidate' },
        dedupe_key: 'candidate_signup:user-1',
      })
    )
  })
})
