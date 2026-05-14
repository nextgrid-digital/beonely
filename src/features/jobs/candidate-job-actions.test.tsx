import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { ProfileRow } from '@/lib/supabase/database.types'
import { RecordApplicationButton } from '@/features/jobs/candidate-job-actions'

type AuthHookMock = {
  user: User | null
  session: Session | null
  profile: ProfileRow | null
  loading: boolean
  configured: boolean
  refreshProfile: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}

const useAuthMock = vi.hoisted(() =>
  vi.fn(
    (): AuthHookMock => ({
      user: { id: 'user-1', email: 'a@b.com' } as User,
      session: null,
      profile: null,
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })
  )
)

const maybeSingleApp = vi.fn()
const insertApp = vi.fn()

const mocks = vi.hoisted(() => ({
  getSupabaseConfigured: vi.fn(() => true),
}))

vi.mock('@/context/auth-provider', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseConfigured: () => mocks.getSupabaseConfigured(),
  getSupabaseBrowserClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: maybeSingleApp,
          })),
        })),
      })),
      insert: insertApp,
    })),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function renderRecord(ui: ReactElement, client?: QueryClient) {
  const qc =
    client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('RecordApplicationButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSupabaseConfigured.mockReturnValue(true)
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', email: 'a@b.com' } as User,
      session: null,
      profile: null,
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })
    maybeSingleApp.mockResolvedValue({ data: null, error: null })
    insertApp.mockResolvedValue({ error: null })
  })

  it('renders nothing when user is missing', async () => {
    useAuthMock.mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: false,
      configured: true,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
    })
    const screen = await renderRecord(
      <RecordApplicationButton jobId='job-1' jobTitle='Engineer' />
    )
    expect(screen.container.querySelector('button')).toBeNull()
  })

  it('renders nothing when Supabase is not configured', async () => {
    mocks.getSupabaseConfigured.mockReturnValue(false)
    const screen = await renderRecord(
      <RecordApplicationButton jobId='job-1' jobTitle='Engineer' />
    )
    expect(screen.container.querySelector('button')).toBeNull()
  })

  it('shows disabled state when application already exists', async () => {
    maybeSingleApp.mockResolvedValue({ data: { id: 'app-1' }, error: null })
    const screen = await renderRecord(
      <RecordApplicationButton jobId='job-1' jobTitle='Engineer' />
    )
    await vi.waitFor(() =>
      expect
        .element(screen.getByRole('button', { name: /Application recorded/i }))
        .toBeDisabled()
    )
  })

  it('saves application and shows success toast', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const screen = await renderRecord(
      <RecordApplicationButton jobId='job-1' jobTitle='Engineer' />,
      qc
    )
    await vi.waitFor(() =>
      expect
        .element(screen.getByRole('button', { name: /Mark as applied/i }))
        .toBeInTheDocument()
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Mark as applied/i })
    )
    await expect
      .element(screen.getByText(/Saves a note on your account/i))
      .toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Save$/i }))
    await vi.waitFor(() => expect(insertApp).toHaveBeenCalled())
    expect(insertApp).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        job_id: 'job-1',
      })
    )
    await vi.waitFor(() =>
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
        'Application recorded'
      )
    )
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it('shows duplicate error toast on unique violation', async () => {
    insertApp.mockResolvedValue({
      error: { code: '23505', message: 'duplicate' },
    })
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const screen = await renderRecord(
      <RecordApplicationButton jobId='job-1' jobTitle='Engineer' />,
      qc
    )
    await vi.waitFor(() =>
      expect
        .element(screen.getByRole('button', { name: /Mark as applied/i }))
        .toBeInTheDocument()
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Mark as applied/i })
    )
    await expect
      .element(screen.getByText(/Saves a note on your account/i))
      .toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Save$/i }))
    await vi.waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'You already recorded an application for this job'
      )
    )
  })

  it('renders small size when requested', async () => {
    const screen = await renderRecord(
      <RecordApplicationButton jobId='job-1' jobTitle='Engineer' size='sm' />
    )
    await vi.waitFor(() =>
      expect
        .element(screen.getByRole('button', { name: /Mark as applied/i }))
        .toBeInTheDocument()
    )
    const btn = screen.getByRole('button', { name: /Mark as applied/i })
    await expect.element(btn).toHaveClass('h-8')
  })
})
