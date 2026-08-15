import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handle } from '../_handlers/marketing/unsubscribe.js'

const validToken = '11111111-1111-4111-8111-111111111111'

const mocks = vi.hoisted(() => ({
  tryGetServiceSupabase: vi.fn(),
  unsubscribeByToken: vi.fn(),
}))

vi.mock('../_lib/marketing-consent.js', () => ({
  unsubscribeByToken: mocks.unsubscribeByToken,
}))

vi.mock('../_lib/supabase.js', () => ({
  tryGetServiceSupabase: mocks.tryGetServiceSupabase,
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
    send(value: unknown) {
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
    headers: Record<string, string>
  }
}

describe('unsubscribe confirmation boundary', () => {
  beforeEach(() => {
    mocks.tryGetServiceSupabase.mockReset()
    mocks.unsubscribeByToken.mockReset()
    mocks.tryGetServiceSupabase.mockReturnValue({
      ok: true,
      client: { service: true },
    })
    mocks.unsubscribeByToken.mockResolvedValue({
      ok: true,
      email: 'person@example.com',
    })
  })

  it('renders confirmation on GET without opening a database connection or mutating consent', async () => {
    const res = response()

    await handle(
      {
        method: 'GET',
        query: { token: validToken },
        headers: {},
      } as unknown as VercelRequest,
      res
    )

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8')
    expect(res.headers['Cache-Control']).toBe('private, no-store')
    expect(String(res.body)).toContain('Confirm unsubscribe')
    expect(String(res.body)).toContain(validToken)
    expect(mocks.tryGetServiceSupabase).not.toHaveBeenCalled()
    expect(mocks.unsubscribeByToken).not.toHaveBeenCalled()
  })

  it('mutates consent only on POST and returns JSON to API clients', async () => {
    const res = response()

    await handle(
      {
        method: 'POST',
        query: { token: validToken },
        headers: { accept: 'application/json' },
      } as unknown as VercelRequest,
      res
    )

    expect(mocks.tryGetServiceSupabase).toHaveBeenCalledTimes(1)
    expect(mocks.unsubscribeByToken).toHaveBeenCalledWith(
      { service: true },
      validToken
    )
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ok: true, email: 'person@example.com' })
  })

  it('rejects malformed tokens before a database lookup', async () => {
    const res = response()

    await handle(
      {
        method: 'POST',
        query: { token: 'not-a-token' },
        headers: { accept: 'application/json' },
      } as unknown as VercelRequest,
      res
    )

    expect(res.statusCode).toBe(400)
    expect(mocks.tryGetServiceSupabase).not.toHaveBeenCalled()
    expect(mocks.unsubscribeByToken).not.toHaveBeenCalled()
  })
})
