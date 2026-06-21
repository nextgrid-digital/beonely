import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockInsertSingle = vi.fn()
const mockInsert = vi.fn(() => ({
  select: vi.fn(() => ({
    single: mockInsertSingle,
  })),
}))
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockRateLimit = vi.fn(async () => undefined)

vi.mock('../_lib/rate-limit.js', () => ({
  rateLimitOrThrow: mockRateLimit,
}))

vi.mock('../_lib/supabase.js', () => ({
  tryGetServiceSupabase: vi.fn(() => ({
    ok: true,
    client: {
      from: mockFrom,
    },
  })),
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

describe('api/hiring-request', () => {
  beforeEach(() => {
    mockInsertSingle.mockReset()
    mockInsertSingle.mockResolvedValue({ data: { id: 'req_123' }, error: null })
    mockFrom.mockClear()
    mockInsert.mockClear()
    mockRateLimit.mockClear()
  })

  it('rejects non-POST methods', async () => {
    const { default: handler } = await import('../hiring-request.js')
    const res = mockRes()
    await handler({ method: 'GET' } as VercelRequest, res)
    expect(res.statusCode).toBe(405)
    expect(res.body).toEqual({ error: 'method_not_allowed' })
  })

  it('stores a valid hiring request', async () => {
    const { default: handler } = await import('../hiring-request.js')
    const res = mockRes()

    await handler(
      {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' },
        body: {
          company_name: 'Acme',
          contact_name: 'Abin Panda',
          email: 'ABIN@EXAMPLE.COM',
          phone: '12345',
          company_website: 'https://example.com',
          role_title: 'ServiceNow Developer',
          hiring_type: 'full_time',
          work_mode: 'remote',
          location: 'Bangalore',
          timeline: 'Immediate',
          headcount: 2,
          servicenow_scope: 'ITSM, CMDB',
          notes: 'Need shortlist in 7 days',
        },
      } as unknown as VercelRequest,
      res
    )

    expect(res.statusCode).toBe(201)
    expect(res.body).toEqual({ ok: true, id: 'req_123' })
    expect(mockRateLimit).toHaveBeenCalledWith('hiring-request:127.0.0.1')
    expect(mockFrom).toHaveBeenCalledWith('hiring_requests')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: 'Acme',
        contact_name: 'Abin Panda',
        email: 'abin@example.com',
        role_title: 'ServiceNow Developer',
        hiring_type: 'full_time',
        status: 'new',
        source: 'hire_page',
      })
    )
  })
})
