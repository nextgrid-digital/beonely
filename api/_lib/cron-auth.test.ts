import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requireCronAuthorization } from './cron-auth.js'

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
    body: unknown
  }
}

afterEach(() => vi.unstubAllEnvs())

describe('requireCronAuthorization', () => {
  it('fails closed when no cron secret is configured', () => {
    vi.stubEnv('CRON_SECRET', '')
    vi.stubEnv('CRON_INGEST_SECRET', '')
    const res = response()

    expect(
      requireCronAuthorization({ headers: {} } as VercelRequest, res)
    ).toBe(false)
    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: 'cron_not_configured' })
  })

  it('rejects an incorrect bearer token', () => {
    vi.stubEnv('CRON_SECRET', 'correct-secret-value')
    const res = response()

    expect(
      requireCronAuthorization(
        { headers: { authorization: 'Bearer incorrect' } } as VercelRequest,
        res
      )
    ).toBe(false)
    expect(res.statusCode).toBe(401)
  })

  it('accepts the configured bearer token', () => {
    vi.stubEnv('CRON_SECRET', 'correct-secret-value')
    const res = response()

    expect(
      requireCronAuthorization(
        {
          headers: { authorization: 'Bearer correct-secret-value' },
        } as VercelRequest,
        res
      )
    ).toBe(true)
    expect(res.statusCode).toBe(200)
  })
})
