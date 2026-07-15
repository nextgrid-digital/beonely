import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handle } from '../_handlers/marketing/unsubscribe.js'

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
        query: { token: 'token" onmouseover="alert(1)' },
        headers: {},
      } as unknown as VercelRequest,
      res
    )

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8')
    expect(res.headers['Cache-Control']).toBe('private, no-store')
    expect(String(res.body)).toContain('Confirm unsubscribe')
    expect(String(res.body)).toContain('token&quot; onmouseover=&quot;alert(1)')
    expect(mocks.tryGetServiceSupabase).not.toHaveBeenCalled()
    expect(mocks.unsubscribeByToken).not.toHaveBeenCalled()
  })

  it('mutates consent only on POST and returns JSON to API clients', async () => {
    const res = response()

    await handle(
      {
        method: 'POST',
        query: { token: 'valid-token' },
        headers: { accept: 'application/json' },
      } as unknown as VercelRequest,
      res
    )

    expect(mocks.tryGetServiceSupabase).toHaveBeenCalledTimes(1)
    expect(mocks.unsubscribeByToken).toHaveBeenCalledWith(
      { service: true },
      'valid-token'
    )
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ok: true, email: 'person@example.com' })
  })
})
