import { describe, expect, it } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
    send(payload: string) {
      this.body = payload
      return this
    },
  }
  return res as unknown as VercelResponse & {
    statusCode: number
    body: unknown
    headers: Record<string, string>
  }
}

describe('api/marketing router', () => {
  it('returns 404 when route query is missing', async () => {
    const { default: handler } = await import('./marketing.js')
    const res = mockRes()
    await handler({ method: 'GET', query: {} } as unknown as VercelRequest, res)
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: 'not_found' })
  })

  it('dispatches unsubscribe with missing token', async () => {
    const { default: handler } = await import('./marketing.js')
    const res = mockRes()
    await handler(
      {
        method: 'GET',
        query: { route: 'unsubscribe' },
      } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(400)
    expect(res.body).toBe('Missing unsubscribe token.')
  })

  it('rejects subscribe without POST', async () => {
    const { default: handler } = await import('./marketing.js')
    const res = mockRes()
    await handler(
      {
        method: 'GET',
        query: { route: 'subscribe' },
      } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(405)
    expect(res.body).toEqual({ error: 'method_not_allowed' })
  })
})
