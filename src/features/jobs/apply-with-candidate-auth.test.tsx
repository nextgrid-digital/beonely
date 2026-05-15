import type { ReactElement } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { ProfileRow } from '@/lib/supabase/database.types'
import { defaultResumeStructured } from '@/lib/candidate/resume-structured-schema'
import { ApplyWithCandidateAuth } from '@/features/jobs/apply-with-candidate-auth'

const navigate = vi.fn()
const maybeSingleProfile = vi.fn()
const maybeSingleApplication = vi.fn()
const insertApplication = vi.fn()

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

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  message: vi.fn(),
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
      if (table === 'applications') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: maybeSingleApplication,
              })),
            })),
          })),
          insert: insertApplication,
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          })),
        })),
      }
    },
  }),
}))

vi.mock('@/lib/candidate/sync-job-seeker-from-metadata', () => ({
  syncJobSeekerFromUserMetadata: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('sonner', () => ({
  toast: toastMock,
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

const linkedInJob = {
  id: 'job-li',
  recruiter_id: 'rec-1',
  apply_url: 'https://www.linkedin.com/jobs/view/1',
  source_kind: 'linkedin_import' as const,
  job_slug: 'test-role',
  job_title: 'Test role',
}

const postedJob = {
  id: 'job-posted',
  recruiter_id: 'rec-1',
  apply_url: 'https://example.com/apply',
  source_kind: 'recruiter_posted' as const,
  job_slug: 'posted-role',
  job_title: 'Posted role',
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
    recruiter_row_id: null,
  }
}

function renderWithQuery(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
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
    maybeSingleApplication.mockResolvedValue({ data: null, error: null })
    insertApplication.mockResolvedValue({ error: null })
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

  it('opens auth stub when visitor clicks Apply (LinkedIn listing)', async () => {
    const screen = await renderWithQuery(
      <ApplyWithCandidateAuth job={linkedInJob} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Apply on LinkedIn/i })
    )
    await expect
      .element(screen.getByTestId('auth-modal-complete'))
      .toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('opens auth when visitor clicks Beonely apply', async () => {
    const screen = await renderWithQuery(
      <ApplyWithCandidateAuth job={postedJob} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Apply with your Beonely profile/i })
    )
    await expect
      .element(screen.getByTestId('auth-modal-complete'))
      .toBeInTheDocument()
  })

  it('navigates to candidate profile when profile incomplete (LinkedIn)', async () => {
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

    const screen = await renderWithQuery(
      <ApplyWithCandidateAuth job={linkedInJob} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Apply on LinkedIn/i })
    )
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/candidate/profile',
        search: { returnTo: '/jobs/test-role' },
      })
    )
  })

  it('opens apply URL when candidate profile is complete (LinkedIn)', async () => {
    useAuthMock.mockReturnValue({
      user: candidateUser(),
      session: {} as Session,
      profile: candidateProfile(),
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })

    const screen = await renderWithQuery(
      <ApplyWithCandidateAuth job={linkedInJob} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Apply on LinkedIn/i })
    )
    await vi.waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        'https://www.linkedin.com/jobs/view/1',
        '_blank',
        'noopener,noreferrer'
      )
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('opens apply URL for recruiter without profile gate (LinkedIn)', async () => {
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

    const screen = await renderWithQuery(
      <ApplyWithCandidateAuth job={linkedInJob} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Apply on LinkedIn/i })
    )
    await vi.waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        'https://www.linkedin.com/jobs/view/1',
        '_blank',
        'noopener,noreferrer'
      )
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('submits Beonely application when profile is complete', async () => {
    useAuthMock.mockReturnValue({
      user: candidateUser(),
      session: {} as Session,
      profile: candidateProfile(),
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'c@d.com' } },
      error: null,
    })
    maybeSingleProfile.mockResolvedValue({
      data: {
        linkedin_url: 'https://www.linkedin.com/in/ok',
        phone: '+1 555 123 4567',
        email: 'c@d.com',
        full_name: 'Candidate',
        portfolio_url: null,
        resume_structured: defaultResumeStructured(),
        resume_storage_path: null,
      },
      error: null,
    })

    const screen = await renderWithQuery(
      <ApplyWithCandidateAuth job={postedJob} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Apply with your Beonely profile/i })
    )
    await vi.waitFor(() => expect(insertApplication).toHaveBeenCalled())
  })

  it('shows inline error when profile lookup fails during apply flow', async () => {
    useAuthMock.mockReturnValue({
      user: candidateUser(),
      session: {} as Session,
      profile: candidateProfile(),
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })
    maybeSingleProfile.mockRejectedValueOnce(new Error('Temporary backend error'))

    const screen = await renderWithQuery(
      <ApplyWithCandidateAuth job={linkedInJob} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Apply on LinkedIn/i })
    )

    await vi.waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('Temporary backend error')
    )
    expect(navigate).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: '/500' })
    )
  })
})
