import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { userEvent, type Locator } from 'vitest/browser'
import { ResetPasswordForm } from './reset-password-form'

const navigate = vi.fn()

const updateUser = vi.fn().mockResolvedValue({ data: { user: {} }, error: null })
const signOut = vi.fn().mockResolvedValue(undefined)

const mocks = vi.hoisted(() => ({
  getSession: vi.fn().mockResolvedValue({
    data: { session: { user: { id: 'u1' } } },
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseConfigured: () => true,
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: { unsubscribe: vi.fn() },
        },
      })),
      updateUser,
      signOut,
    },
  }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ResetPasswordForm', () => {
  let screen: RenderResult
  let newPassword: Locator
  let confirmPassword: Locator
  let updateButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    })

    screen = await render(<ResetPasswordForm />)
    newPassword = screen.getByLabelText(/^New password$/i)
    confirmPassword = screen.getByLabelText(/^Confirm password$/i)
    updateButton = screen.getByRole('button', { name: /^Update password$/i })

    await vi.waitFor(async () => {
      await expect.element(updateButton).not.toBeDisabled()
    })
  })

  it('renders password fields and update button', async () => {
    await expect.element(newPassword).toBeInTheDocument()
    await expect.element(confirmPassword).toBeInTheDocument()
    await expect.element(updateButton).toBeInTheDocument()
  })

  it('shows validation when submitting empty form', async () => {
    await userEvent.click(updateButton)
    await expect
      .element(screen.getByText(/^Please enter your password\.$/i))
      .toBeInTheDocument()
  })

  it('calls updateUser, signOut, and navigates on success', async () => {
    await userEvent.fill(newPassword, 'secret12')
    await userEvent.fill(confirmPassword, 'secret12')
    await userEvent.click(updateButton)

    await vi.waitFor(() => expect(updateUser).toHaveBeenCalledOnce())
    expect(updateUser).toHaveBeenCalledWith({ password: 'secret12' })
    await vi.waitFor(() => expect(signOut).toHaveBeenCalledOnce())
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(navigate).toHaveBeenCalledWith({
      to: '/sign-in',
      replace: true,
    })
  })
})
