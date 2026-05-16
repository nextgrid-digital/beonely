import type { ProfileRow } from '@/lib/supabase/database.types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { GeneralError } from '@/features/errors/general-error'

const navigate = vi.hoisted(() => vi.fn())
const goBack = vi.hoisted(() => vi.fn())
const signOut = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const useAuthMock = vi.hoisted(() =>
  vi.fn(() => ({
    profile: null as ProfileRow | null,
    signOut,
  }))
)

vi.mock('@/context/auth-provider', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@tanstack/react-router', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useRouter: () => ({ history: { go: goBack } }),
  }
})

describe('GeneralError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signOut.mockResolvedValue(undefined)
    useAuthMock.mockReturnValue({
      profile: null,
      signOut,
    })
  })

  it('routes recruiter users back to recruiter home', async () => {
    useAuthMock.mockReturnValue({
      profile: {
        id: 'p1',
        email: 'r@beonely.com',
        role: 'recruiter',
        created_at: '',
        updated_at: '',
        recruiter_row_id: 'r1',
      },
      signOut,
    })

    const screen = await render(<GeneralError />)
    await userEvent.click(
      screen.getByRole('button', { name: /Back to Recruiter Home/i })
    )
    expect(navigate).toHaveBeenCalledWith({ to: '/recruiter' })
  })

  it('keeps default home navigation for non-recruiter sessions', async () => {
    const screen = await render(<GeneralError />)
    await userEvent.click(screen.getByRole('button', { name: /Back to Home/i }))
    expect(navigate).toHaveBeenCalledWith({ to: '/' })
  })

  it('supports Sign in again fallback path', async () => {
    useAuthMock.mockReturnValue({
      profile: {
        id: 'p1',
        email: 'r@beonely.com',
        role: 'recruiter',
        created_at: '',
        updated_at: '',
        recruiter_row_id: 'r1',
      },
      signOut,
    })

    const screen = await render(<GeneralError />)
    await userEvent.click(screen.getByRole('button', { name: /Sign in again/i }))

    expect(signOut).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith({
      to: '/sign-in',
      search: { redirect: '/recruiter' },
    })
  })
})
