import { describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

vi.mock('../_lib/admin-auth.js', () => ({
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

describe('api/admin/email templates router', () => {
  it('routes templates list with auth', async () => {
    const { default: handler } = await import('../admin/[...segments].js')
    const res = mockRes()
    await handler(
      {
        method: 'GET',
        url: '/api/admin/email/templates',
        query: { segments: ['email', 'templates'] },
        headers: {},
      } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(401)
  })

  it('routes templates/:id with auth', async () => {
    const { default: handler } = await import('../admin/[...segments].js')
    const res = mockRes()
    await handler(
      {
        method: 'GET',
        url: '/api/admin/email/templates/00000000-0000-4000-8000-000000000001',
        query: {
          segments: [
            'email',
            'templates',
            '00000000-0000-4000-8000-000000000001',
          ],
        },
        headers: {},
      } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for unknown email admin route', async () => {
    const { default: handler } = await import('../admin/[...segments].js')
    const res = mockRes()
    await handler(
      {
        method: 'GET',
        query: { segments: 'unknown' },
        headers: {},
      } as unknown as VercelRequest,
      res
    )
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: 'not_found' })
  })
})
