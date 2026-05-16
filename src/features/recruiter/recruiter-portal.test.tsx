import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { RecruiterPortal } from '@/features/recruiter/recruiter-portal'

const useQueryMock = vi.hoisted(() => vi.fn())
const useMutationMock = vi.hoisted(() =>
  vi.fn((_options?: unknown) => ({
    mutate: vi.fn(),
    isPending: false,
  }))
)

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  }
})

vi.mock('@/context/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'r@test.com' },
    session: { access_token: 'tok' },
    profile: { role: 'recruiter' },
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseConfigured: () => true,
  getSupabaseBrowserClient: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({
      children,
      ...props
    }: {
      children: React.ReactNode
      to?: string
    }) => <a href={props.to}>{children}</a>,
  }
})

describe('RecruiterPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows load error instead of company onboarding when recruiter query fails', async () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'recruiter') {
        return {
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: new Error('network'),
          refetch: vi.fn(),
        }
      }
      return {
        isLoading: false,
        isError: false,
        isSuccess: false,
        data: undefined,
        refetch: vi.fn(),
      }
    })

    const screen = await render(<RecruiterPortal />)

    await expect
      .element(screen.getByText('Could not load recruiter account'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /try again/i }))
      .toBeInTheDocument()
    expect(screen.getByText('Company details').elements()).toHaveLength(0)
  })
})
