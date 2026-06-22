import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockHiringInsert = vi.fn(() => ({ select: mockInsertSelect }))
const mockLogInsert = vi.fn(async () => ({ error: null }))
const mockFrom = vi.fn((table: string) => {
  if (table === 'hiring_requests') {
    return { insert: mockHiringInsert }
  }
  if (table === 'email_send_log') {
    return { insert: mockLogInsert }
  }
  throw new Error(`unexpected_table:${table}`)
})
const mockRateLimit = vi.fn(async () => undefined)
const mockSendTransactionalEmail = vi.fn(async () => ({ skipped: true as const }))

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

vi.mock('../_lib/resend.js', () => ({
  sendTransactionalEmail: mockSendTransactionalEmail,
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
    mockHiringInsert.mockClear()
    mockInsertSelect.mockClear()
    mockLogInsert.mockClear()
    mockRateLimit.mockClear()
    mockSendTransactionalEmail.mockClear()
    mockSendTransactionalEmail.mockResolvedValue({ skipped: true })
  })

  it('rejects non-POST methods', async () => {
    const { handle } = await import('../_handlers/marketing/hiring-request.js')
    const res = mockRes()
    await handle({ method: 'GET' } as VercelRequest, res)
    expect(res.statusCode).toBe(405)
    expect(res.body).toEqual({ error: 'method_not_allowed' })
  })

  it('stores a valid hiring request and logs internal notifications', async () => {
    const { handle } = await import('../_handlers/marketing/hiring-request.js')
    const res = mockRes()

    await handle(
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
    expect(mockHiringInsert).toHaveBeenCalledWith(
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
    expect(mockSendTransactionalEmail).toHaveBeenCalledTimes(2)
    expect(mockLogInsert).toHaveBeenCalledTimes(2)
  })
})
