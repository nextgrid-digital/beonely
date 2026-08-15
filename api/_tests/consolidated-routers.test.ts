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
  }
  return res as unknown as VercelResponse & {
    statusCode: number
    body: unknown
    headers: Record<string, string>
  }
}

describe('consolidated serverless routers', () => {
  it('returns 404 for a missing payment route', async () => {
    const { default: handler } = await import('../payments.js')
    const res = mockRes()
    await handler({ method: 'GET', query: {} } as unknown as VercelRequest, res)
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: 'not_found' })
  })

  it('returns 404 for a missing asset route', async () => {
    const { default: handler } = await import('../assets.js')
    const res = mockRes()
    await handler({ method: 'GET', query: {} } as unknown as VercelRequest, res)
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: 'not_found' })
  })

  it.each([
    ['create-order', 'GET'],
    ['verify-payment', 'GET'],
  ])('dispatches the %s payment route', async (route, method) => {
    const { default: handler } = await import('../payments.js')
    const res = mockRes()
    await handler(
      { method, query: { route } } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(405)
    expect(res.body).toEqual({ error: 'method_not_allowed' })
  })

  it('dispatches the public portfolio route', async () => {
    const { default: handler } = await import('../assets.js')
    const res = mockRes()
    await handler(
      {
        method: 'GET',
        query: { route: 'public-portfolio' },
      } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'invalid_slug' })
  })

  it('dispatches the application asset route', async () => {
    const { default: handler } = await import('../assets.js')
    const res = mockRes()
    await handler(
      {
        method: 'GET',
        query: { route: 'application-asset' },
      } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(405)
    expect(res.body).toEqual({ error: 'method_not_allowed' })
  })
})
