import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  requireCandidateAccountBeforeLoad,
  requireRecruiterAccountBeforeLoad,
} from '@/lib/auth/route-guards'

const redirectMock = vi.hoisted(() =>
  vi.fn((input: { to: string; search?: Record<string, unknown> }) => ({
    __redirect: true,
    ...input,
  }))
)

const mockGetSession = vi.hoisted(() => vi.fn())
const mockMaybeSingle = vi.hoisted(() => vi.fn())
const mockConfigured = vi.hoisted(() => vi.fn(() => true))
const mockIsRecruiterRegistrationMetadata = vi.hoisted(() =>
  vi.fn((_user?: unknown) => false)
)

vi.mock('@tanstack/react-router', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    redirect: (input: { to: string; search?: Record<string, unknown> }) =>
      redirectMock(input),
  }
})

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseConfigured: () => mockConfigured(),
  getSupabaseBrowserClient: () => ({
    auth: { getSession: mockGetSession },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/auth/registration-intent', () => ({
  isRecruiterRegistrationMetadata: (user: unknown) =>
    mockIsRecruiterRegistrationMetadata(user),
}))

function session(role = 'u1') {
  return { data: { session: { user: { id: role } } } }
}

describe('route-guards fail-safe redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigured.mockReturnValue(true)
    mockIsRecruiterRegistrationMetadata.mockReturnValue(false)
    mockMaybeSingle.mockResolvedValue({ data: { role: 'recruiter' } })
  })

  it('redirects to sign-in when session fetch fails in recruiter beforeLoad', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('network down'))

    await expect(
      requireRecruiterAccountBeforeLoad({ loginRedirectPath: '/recruiter' })
    ).rejects.toMatchObject({
      __redirect: true,
      to: '/sign-in',
      search: { redirect: '/recruiter' },
    })
  })

  it('redirects to sign-in when persona resolution fails after auth passes', async () => {
    mockGetSession
      .mockResolvedValueOnce(session('u1'))
      .mockRejectedValueOnce(new Error('persona lookup failed'))

    await expect(
      requireRecruiterAccountBeforeLoad({ loginRedirectPath: '/recruiter' })
    ).rejects.toMatchObject({
      __redirect: true,
      to: '/sign-in',
      search: { redirect: '/recruiter' },
    })
  })

  it('still allows valid recruiter session and keeps candidate protection', async () => {
    mockGetSession.mockResolvedValue(session('u1'))
    mockMaybeSingle.mockResolvedValue({ data: { role: 'recruiter' } })

    await expect(
      requireRecruiterAccountBeforeLoad({ loginRedirectPath: '/recruiter' })
    ).resolves.toBeUndefined()

    await expect(
      requireCandidateAccountBeforeLoad({
        loginRedirectPath: '/candidate/profile',
      })
    ).rejects.toMatchObject({
      __redirect: true,
      to: '/recruiter',
    })
  })
})
