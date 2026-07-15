import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rateLimitOrThrow, resetLocalRateLimitsForTests } from './rate-limit.js'

vi.mock('./supabase.js', () => ({
  tryGetServiceSupabase: vi.fn(() => ({
    ok: false,
    reason: 'missing_service_role_key',
  })),
}))

describe('rateLimitOrThrow', () => {
  beforeEach(() => {
    resetLocalRateLimitsForTests()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('VERCEL_ENV', '')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('enforces the bounded local fallback outside production', async () => {
    await rateLimitOrThrow('test-key', { limit: 2, windowSeconds: 60 })
    await rateLimitOrThrow('test-key', { limit: 2, windowSeconds: 60 })

    await expect(
      rateLimitOrThrow('test-key', { limit: 2, windowSeconds: 60 })
    ).rejects.toMatchObject({
      code: 'rate_limited',
      statusCode: 429,
    })
  })

  it('fails closed in production when the shared store is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    await expect(rateLimitOrThrow('production-key')).rejects.toMatchObject({
      code: 'rate_limit_unavailable',
      statusCode: 503,
    })
  })
})
