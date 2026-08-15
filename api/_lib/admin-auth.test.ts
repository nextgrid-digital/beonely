import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireStaffAdmin } from './admin-auth.js'

const mocks = vi.hoisted(() => ({
  getUserFromBearer: vi.fn(),
  recruiterResult: {
    data: { role: 'admin', disabled: false } as {
      role: string
      disabled: boolean
    } | null,
    error: null as unknown,
  },
}))

vi.mock('./admin-access.js', () => ({
  isAllowlistedAdminEmail: vi.fn(() => true),
}))

vi.mock('./supabase.js', () => ({
  getUserFromBearer: mocks.getUserFromBearer,
  tryGetServiceSupabase: vi.fn(() => ({
    ok: true,
    client: {
      from: vi.fn(() => ({
        select() {
          return this
        },
        eq() {
          return this
        },
        maybeSingle: vi.fn(async () => mocks.recruiterResult),
      })),
    },
  })),
}))

function response() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(value: unknown) {
      this.body = value
      return this
    },
  }
  return res as unknown as VercelResponse & {
    statusCode: number
    body: unknown
  }
}

describe('requireStaffAdmin', () => {
  beforeEach(() => {
    mocks.getUserFromBearer.mockReset()
    mocks.recruiterResult = {
      data: { role: 'admin', disabled: false },
      error: null,
    }
  })

  it('requires an authenticated user', async () => {
    mocks.getUserFromBearer.mockResolvedValue({ user: null })
    const res = response()

    expect(
      await requireStaffAdmin({ headers: {} } as VercelRequest, res)
    ).toBeNull()
    expect(res.statusCode).toBe(401)
  })

  it('rejects a disabled admin even when the email is allowlisted', async () => {
    mocks.getUserFromBearer.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        email_confirmed_at: '2026-07-10T00:00:00Z',
      },
    })
    mocks.recruiterResult.data = { role: 'admin', disabled: true }
    const res = response()

    expect(
      await requireStaffAdmin(
        {
          headers: { authorization: 'Bearer valid' },
        } as VercelRequest,
        res
      )
    ).toBeNull()
    expect(res.statusCode).toBe(403)
  })

  it('accepts an allowlisted, confirmed, active database admin', async () => {
    const user = {
      id: 'user-1',
      email: 'admin@example.com',
      email_confirmed_at: '2026-07-10T00:00:00Z',
    }
    mocks.getUserFromBearer.mockResolvedValue({ user })
    const res = response()

    expect(
      await requireStaffAdmin(
        {
          headers: { authorization: 'Bearer valid' },
        } as VercelRequest,
        res
      )
    ).toEqual(user)
    expect(res.statusCode).toBe(200)
  })
})
