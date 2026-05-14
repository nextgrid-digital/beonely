import type { Session, User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { ProfileRow } from '@/lib/supabase/database.types'
import { ApplyWithCandidateAuth } from '@/features/jobs/apply-with-candidate-auth'

const navigate = vi.fn()
const maybeSingleProfile = vi.fn()

const useAuthMock = vi.hoisted(() =>
  vi.fn(() => ({
    user: null as User | null,
    session: null as Session | null,
    profile: null as ProfileRow | null,
    loading: false,
    configured: true,
    refreshProfile: vi.fn(),
    signOut: vi.fn(),
  }))
)

const mocks = vi.hoisted(() => ({
  getSupabaseConfigured: vi.fn(() => true),
  getUser: vi
    .fn()
    .mockResolvedValue({ data: { user: { id: 'auth-u1' } }, error: null }),
}))

vi.mock('@/context/auth-provider', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@tanstack/react-router', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseConfigured: () => mocks.getSupabaseConfigured(),
  getSupabaseBrowserClient: () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table === 'job_seeker_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: maybeSingleProfile,
            })),
          })),
        }
      }
      return {}
    },
  }),
}))

vi.mock('@/lib/candidate/sync-job-seeker-from-metadata', () => ({
  syncJobSeekerFromUserMetadata: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/features/auth/auth-modal', () => ({
  AuthModal: ({
    open,
    onAuthComplete,
  }: {
    open: boolean
    onAuthComplete?: (p: ProfileRow | null) => void
  }) =>
    open ? (
      <button
        type='button'
        data-testid='auth-modal-complete'
        onClick={() => onAuthComplete?.(null)}
      >
        Auth complete
      </button>
    ) : null,
}))

const sampleJob = {
  apply_url: 'https://example.com/apply',
  source_kind: 'recruiter_posted' as const,
  job_slug: 'test-role',
  job_title: 'Test role',
}

function candidateUser(): User {
  return { id: 'u1', email: 'c@d.com' } as User
}

function candidateProfile(): ProfileRow {
  return {
    id: 'p1',
    email: 'c@d.com',
    role: 'candidate',
    created_at: '',
    updated_at: '',
  }
}

describe('ApplyWithCandidateAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSupabaseConfigured.mockReturnValue(true)
    maybeSingleProfile.mockResolvedValue({
      data: {
        linkedin_url: 'https://www.linkedin.com/in/ok',
        phone: '+1 555 123 4567',
      },
      error: null,
    })
    useAuthMock.mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('opens auth stub when visitor clicks Apply', async () => {
    const screen = await render(<ApplyWithCandidateAuth job={sampleJob} />)
    await userEvent.click(
      screen.getByRole('button', { name: /Apply externally/i })
    )
    await expect
      .element(screen.getByTestId('auth-modal-complete'))
      .toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('navigates to candidate profile when profile incomplete', async () => {
    useAuthMock.mockReturnValue({
      user: candidateUser(),
      session: {} as Session,
      profile: candidateProfile(),
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })
    maybeSingleProfile.mockResolvedValue({
      data: { linkedin_url: null, phone: null },
      error: null,
    })

    const screen = await render(<ApplyWithCandidateAuth job={sampleJob} />)
    await userEvent.click(
      screen.getByRole('button', { name: /Apply externally/i })
    )
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/candidate/profile',
        search: { returnTo: '/jobs/test-role' },
      })
    )
  })

  it('opens apply URL when candidate profile is complete', async () => {
    useAuthMock.mockReturnValue({
      user: candidateUser(),
      session: {} as Session,
      profile: candidateProfile(),
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })

    const screen = await render(<ApplyWithCandidateAuth job={sampleJob} />)
    await userEvent.click(
      screen.getByRole('button', { name: /Apply externally/i })
    )
    await vi.waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        'https://example.com/apply',
        '_blank',
        'noopener,noreferrer'
      )
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('opens apply URL for recruiter without profile gate', async () => {
    useAuthMock.mockReturnValue({
      user: candidateUser(),
      session: {} as Session,
      profile: {
        id: 'p1',
        email: 'r@d.com',
        role: 'recruiter',
        created_at: '',
        updated_at: '',
      },
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })

    const screen = await render(<ApplyWithCandidateAuth job={sampleJob} />)
    await userEvent.click(
      screen.getByRole('button', { name: /Apply externally/i })
    )
    await vi.waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        'https://example.com/apply',
        '_blank',
        'noopener,noreferrer'
      )
    )
    expect(navigate).not.toHaveBeenCalled()
  })
})
