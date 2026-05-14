// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const envKeys = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'TURNSTILE_SECRET_KEY',
] as const

describe('api/create-order serverless module', () => {
  const saved: Partial<Record<(typeof envKeys)[number], string | undefined>> =
    {}

  beforeEach(() => {
    for (const k of envKeys) {
      saved[k] = process.env[k]
    }
    process.env.SUPABASE_URL = 'https://test-ref.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy'
    process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret'
    delete process.env.TURNSTILE_SECRET_KEY
  })

  afterEach(() => {
    for (const k of envKeys) {
      const v = saved[k]
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('loads create-order default handler without module-eval errors', async () => {
    const mod = await import('./create-order.js')
    expect(typeof mod.default).toBe('function')
  })

  it('tryGetServiceSupabase returns missing_service_role_key when service key absent', async () => {
    const { tryGetServiceSupabase } = await import('./_lib/supabase.js')
    process.env.SUPABASE_URL = 'https://test-ref.supabase.co'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const r = tryGetServiceSupabase()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('missing_service_role_key')
  })
})
