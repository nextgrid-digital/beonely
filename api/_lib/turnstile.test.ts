import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyTurnstileToken } from './turnstile.js'

describe('payment Turnstile verification', () => {
  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY
    vi.unstubAllGlobals()
  })

  it('fails closed when the token was minted for a different action', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: true, action: 'signup' }), {
            status: 200,
          })
      )
    )

    await expect(
      verifyTurnstileToken('token', {
        expectedAction: 'payment_checkout',
        remoteIp: '203.0.113.10',
      })
    ).resolves.toBe(false)
  })

  it('passes the request IP and accepts the exact checkout action', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(String(init?.body)).toContain('remoteip=203.0.113.10')
      return new Response(
        JSON.stringify({ success: true, action: 'payment_checkout' }),
        { status: 200 }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      verifyTurnstileToken('token', {
        expectedAction: 'payment_checkout',
        remoteIp: '203.0.113.10',
      })
    ).resolves.toBe(true)
  })

  it('fails closed on a verification network error', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('down')))
    )

    await expect(
      verifyTurnstileToken('token', { expectedAction: 'payment_checkout' })
    ).resolves.toBe(false)
  })
})
