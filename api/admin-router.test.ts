import { describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

vi.mock('./_lib/admin-auth.js', () => ({
  requireStaffAdmin: vi.fn(async (_req, res) => {
    res.status(401).json({ error: 'unauthorized' })
    return null
  }),
}))

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res as unknown as VercelResponse & {
    statusCode: number
    body: unknown
  }
}

describe('api/admin/[[...segments]] router', () => {
  it('returns 404 for unknown admin routes', async () => {
    const { default: handler } = await import('./admin/[[...segments]].js')
    const res = mockRes()
    await handler(
      { method: 'GET', query: { segments: ['unknown-route'] } } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: 'not_found' })
  })

  it('dispatches campaigns route and enforces staff auth', async () => {
    const { default: handler } = await import('./admin/[[...segments]].js')
    const res = mockRes()
    await handler(
      {
        method: 'GET',
        query: { segments: 'campaigns' },
        headers: {},
      } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(401)
  })

  it('dispatches nested email/automations route', async () => {
    const { default: handler } = await import('./admin/[[...segments]].js')
    const res = mockRes()
    await handler(
      {
        method: 'PATCH',
        query: { segments: ['email', 'automations'] },
        headers: {},
      } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(401)
  })
})
